/*!
 * fees.js - fee estimation for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2024, the raptoracle developers (MIT License).
 * https://github.com/raptoracle/bcoin
 * Ported from:
 * https://github.com/bitcoin/bitcoin/blob/master/src/policy/fees.cpp
 * https://github.com/Raptor3um/raptoreum/blob/master/src/policy/fees.cpp
 */

'use strict';

const assert = require('bsert');
const bio = require('bufio');
const Logger = require('blgr');
const {BufferMap} = require('buffer-map');
const binary = require('../utils/binary');
const {policy} = require('../protocol/params');
const {encoding} = bio;

/*
 * Constants
 */

const {
  DOUBLE_SUCCESS_PCT,
  HALF_SUCCESS_PCT,
  SUCCESS_PCT,
  ESTIMATE_HORIZON,
  INF_FEERATE, 
  MIN_FEERATE, 
  MIN_BUCKET_FEERATE, 
  MAX_BUCKET_FEERATE, 
  FEE_SPACING,
  MED_BLOCK_PERIODS,
  MED_DECAY,
  MED_SCALE,
  SHORT_BLOCK_PERIODS,
  SHORT_DECAY,
  SHORT_SCALE,
  LONG_BLOCK_PERIODS,
  LONG_DECAY,
  LONG_SCALE,
  OLDEST_ESTIMATE_HISTORY,
  SUFFICIENT_FEETXS,
  SUFFICIENT_TXS_SHORT,
  MODE,
  REASON,
} = policy.feeConstants;

const passBucket = {
  start: 0,
  end: 0,
  withinTarget: 0,
  totalConfirmed: 0,
  inMempool: 0,
  leftMempool: 0,
};

const failBucket = {
  start: 0,
  end: 0,
  withinTarget: 0,
  totalConfirmed: 0,
  inMempool: 0,
  leftMempool: 0,
};

const estimationResult = {
  pass: passBucket,
  fail: failBucket,
  decay: 0,
  scale: 0,
};

const feeCalculation = {
  est: estimationResult,
  reason: REASON.NONE,
  desiredTarget: 0,
  returnedTarget: 0,
};

/**
 * Confirmation stats.
 * @alias module:mempool.ConfirmStats
 */

class ConfirmStats {
  /**
   * Create confirmation stats.
   * @constructor
   * @param {String} type
   * @param {Logger?} logger
   */

  constructor(type, logger) {
    this.logger = Logger.global;

    this.type = type;
    this.decay = 0;
    this.scale = 0;
    this.maxConfirms = 0;

    this.buckets = new Float64Array(0);
    this.bucketMap = new DoubleMap();
    this.passBucket = passBucket;
    this.failBucket = failBucket;

    this.confAvg = [];
    this.curBlockConf = [];
    this.unconfTX = [];

    this.oldUnconfTX = new Int32Array(0);
    this.curBlockTX = new Int32Array(0);
    this.txAvg = new Float64Array(0);
    this.curBlockVal = new Float64Array(0);
    this.avg = new Float64Array(0);

    if (logger) {
      assert(typeof logger === 'object');
      this.logger = logger.context('fees');
    }
  }

  /**
   * Initialize stats.
   * @param {Array} buckets
   * @param {Number} maxConfirms
   * @param {Number} decay
   * @param {Number} scale
   * @private
   */

  init(buckets, maxConfirms, decay, scale) {
    this.maxConfirms = maxConfirms;
    this.decay = decay;
    this.scale = scale;

    this.buckets = new Float64Array(buckets.length);
    this.bucketMap = new DoubleMap();

    for (let i = 0; i < buckets.length; i++) {
      this.buckets[i] = buckets[i];
      this.bucketMap.insert(buckets[i], i);
    }

    this.confAvg = new Array(maxConfirms);
    this.failAvg = new Array(maxConfirms);
    this.unconfTX = new Array(maxConfirms);

    for (let i = 0; i < maxConfirms; i++) {
      this.confAvg[i] = new Float64Array(buckets.length);
      this.failAvg[i] = new Float64Array(buckets.length);
      this.unconfTX[i] = new Int32Array(buckets.length);
    }

    this.oldUnconfTX = new Int32Array(buckets.length);
    this.txAvg = new Float64Array(buckets.length);
    this.avg = new Float64Array(buckets.length);

    //this.resizeInMemoryCounter(buckets.length);
  }

  /**
   * Clear unconfirmed and old unconfirmed.
   */

  resizeInMemoryCounter(buckets) {
    this.unconfTX = new Array(this.getMaxConfirms());
    for (let i = 0; i < this.unconfTX.length; i++) {
      this.unconfTX[i] = new Int32Array(buckets);
    }
    this.oldUnconfTX = new Int32Array(buckets);
  }

  /**
   * Clear data for the current block.
   * @param {Number} height
   */

  clearCurrent(height) {
    for (let i = 0; i < this.buckets.length; i++) {
      this.oldUnconfTX[i] += this.unconfTX[height % this.unconfTX.length][i];
      this.unconfTX[height % this.unconfTX.length][i] = 0;
    }
  }

  /**
   * Record a rate based on number of blocks to confirm.
   * @param {Number} blocks - Blocks to confirm.
   * @param {Rate|Number} val - Rate.
   */

  record(blocks, val) {
    if (blocks < 1)
      return;

    const periodsToConfirm = (blocks + this.scale - 1) / this.scale;

    const bucketIndex = this.bucketMap.search(val);

    for (let i = periodsToConfirm; i <= this.confAvg.length; i++)
      this.confAvg[i - 1][bucketIndex]++;

    this.txAvg[bucketIndex]++;
    this.avg[bucketIndex] += val;
  }

  /**
   * Update moving averages.
   */

  updateAverages() {
    for (let i = 0; i < this.buckets.length; i++) {
      for (let j = 0; j < this.confAvg.length; j++) 
        this.confAvg[j][i] = this.confAvg[j][i] * this.decay;
      for (let f = 0; f < this.failAvg.length; f++) 
        this.failAvg[f][i] = this.failAvg[f][i] * this.decay;
      this.avg[i] = this.avg[i] * this.decay;
      this.txAvg[i] = this.txAvg[i] * this.decay;
    }
  }

  /**
   * Estimate the median value for rate or priority.
   * @param {Number} target - Confirmation target.
   * @param {Number} needed - Sufficient tx value.
   * @param {Number} breakpoint - Success break point.
   * @param {Boolean} greater - Whether to look for lowest value.
   * @param {Number} height - Block height.
   * @returns {Rate|Number} Returns -1 on error.
   */

  estimateMedian(target, needed, breakpoint, greater, height, result) {
    
    // Counters for a bucket (or range of buckets)
    let conf = 0; // Number of tx's confirmed within the confTarget
    let total = 0; // Total number of tx's that were ever confirmed
    let extra = 0; // Number of tx's still in mempool for confTarget or longer
    let fail = 0; // Number of tx's that were never confirmed but removed from the mempool after confTarget
    let periodTarget = Math.floor((target + this.scale - 1) / this.scale);

    const max = this.buckets.length - 1;

    console.log(target, needed, breakpoint, greater, height, this.buckets.length, this.scale, periodTarget);

    // requireGreater means we are looking for the lowest feerate such that all higher
    // values pass, so we start at maxbucketindex (highest feerate) and look at successively
    // smaller buckets until we reach failure.  Otherwise, we are looking for the highest
    // feerate such that all lower values fail, and we go in the opposite direction.
    const start = greater ? max : 0;
    const step = greater ? -1 : 1;

    // We'll combine buckets until we have enough samples.
    // The near and far variables will define the range we've combined
    // The best variables are the last range we saw which still had a high
    // enough confirmation rate to count as success.
    // The cur variables are the current range we're counting.
    let near = start;
    let far = start;
    let bestNear = start;
    let bestFar = start;

    let found = false;
    const bins = this.unconfTX.length;
    let newBucketRange = true;
    let passing = true;

    let _failBucket = failBucket;
    let _passBucket = passBucket;

    
    // Start counting from highest(default) or lowest feerate transactions
    for (let bucket = start; bucket >= 0 && bucket <= max; bucket += step) {
      if(newBucketRange) {
        near = bucket;
        newBucketRange = false;
      }
      far = bucket;
      conf += this.confAvg[periodTarget - 1][bucket];
      total += this.txAvg[bucket];
      fail += this.failAvg[periodTarget - 1][bucket];

      for (let confct = target; confct < this.getMaxConfirms(); confct++)
        extra += this.unconfTX[(height - confct) % bins][bucket];

      extra += this.oldUnconfTX[bucket];
      // If we have enough transaction data points in this range of buckets,
      // we can test for success
      // (Only count the confirmed data points, so that each confirmation count
      // will be looking at the same amount of data and same bucket breaks)
      if (total >= needed / (1 - this.decay)) {
        const curPct = conf / (total + fail + extra);

        // Check to see if we are no longer getting confirmed at the success rate
        if ((greater && curPct < breakpoint) || (!greater && curPct > breakpoint)) {
          if(passing == true) {
            // First time we hit a failure record the failed bucket
            let failMinBucket = Math.min(near, far);
            let failMaxBucket = Math.max(near, far);
            _failBucket.start = failMinBucket ? this.buckets[failMinBucket - 1] : 0;
            _failBucket.end = this.buckets[failMaxBucket];
            _failBucket.withinTarget = conf;
            _failBucket.totalConfirmed = total;
            _failBucket.inMempool = extra;
            _failBucket.leftMempool = fail;
            passing = false;
          }
          continue;
        }
        // Otherwise update the cumulative stats, and the bucket variables
        // and reset the counters
        else {
          _failBucket = failBucket;
          found = true;
          passing = true;
          _passBucket.withinTarget = conf;
          conf = 0;
          _passBucket.totalConfirmed = total;
          total = 0;
          _passBucket.inMempool = extra;
          _passBucket.leftMempool = fail;
          fail = 0;
          extra = 0;
          bestNear = near;
          bestFar = far;
          newBucketRange = true;
        }
      }
    }

    let median = -1;
    let sum = 0;

    // Calculate the "average" feerate of the best bucket range that met success conditions
    // Find the bucket with the median transaction and then report the average feerate from that bucket
    // This is a compromise between finding the median which we can't since we don't save all tx's
    // and reporting the average which is less accurate
    const minBucket = Math.min(bestNear, bestFar);
    const maxBucket = Math.max(bestNear, bestFar);

    for (let i = minBucket; i <= maxBucket; i++)
      sum += this.txAvg[i];

    if (found && sum !== 0) {
      sum = sum / 2;
      for (let j = minBucket; j <= maxBucket; j++) {
        if (this.txAvg[j] < sum) {
          sum -= this.txAvg[j];
        } else {
          median = this.avg[j] / this.txAvg[j];
          break;
        }
      }

      _passBucket.start = minBucket ? this.buckets[minBucket-1] : 0;
      _passBucket.end = this.buckets[maxBucket];
    }

    // If we were passing until we reached last few buckets with insufficient data, then report those as failed
    if(passing && !newBucketRange) {
      let failMinBucket = Math.min(near, far);
      let failMaxBucket = Math.max(near, far);
      _failBucket.start = failMinBucket ? this.buckets[failMinBucket - 1] : 0;
      _failBucket.end = this.buckets[failMaxBucket];
      _failBucket.withinTarget = conf;
      _failBucket.totalConfirmed = total;
      _failBucket.inMempool = extra;
      _failBucket.leftMempool = fail;
    }

    this.logger.debug('FeeEst: %d %s%.0f%% decay %.5f: feerate: %g from (%g - %g) %.2f%% %.1f/(%.1f %d mem %.1f out) Fail: (%g - %g) %.2f%% %.1f/(%.1f %d mem %.1f out)', 
      target, greater ? ">" : "<", breakpoint, this.decay, median, _passBucket.start, _passBucket.end,
      100 * _passBucket.withinTarget / (_passBucket.totalConfirmed + _passBucket.inMempool + _passBucket.leftMempool),
      _passBucket.withinTarget, _passBucket.totalConfirmed, _passBucket.inMempool, _passBucket.leftMempool,
      _failBucket.start, _failBucket.end,
      100 * _failBucket.withinTarget / (_failBucket.totalConfirmed + _failBucket.inMempool + _failBucket.leftMempool),
      _failBucket.withinTarget, _failBucket.totalConfirmed, _failBucket.inMempool, _failBucket.leftMempool
    );

    if(typeof result === 'Object') {
      result.pass = _passBucket;
      result.fail = _failBucket;
      result.decay = this.decay;
      result.scale = this.scale;
    }

    return median;
  }

  /**
   * Add a transaction's rate/priority to be tracked.
   * @param {Number} height - Block height.
   * @param {Number} val
   * @returns {Number} Bucket index.
   */

  addTX(height, val) {
    const bucketIndex = this.bucketMap.search(val);
    const blockIndex = height % this.unconfTX.length;
    this.unconfTX[blockIndex][bucketIndex]++;
    this.logger.spam('Adding tx to %s.', this.type);
    return bucketIndex;
  }

  /**
   * Remove a transaction from tracking.
   * @param {Number} entryHeight
   * @param {Number} bestHeight
   * @param {Number} bucketIndex
   * @param {boolean} inBlock
   */

  removeTX(entryHeight, bestHeight, bucketIndex, inBlock) {
    let blocksAgo = bestHeight - entryHeight;

    if (bestHeight === 0)
      blocksAgo = 0;

    if (blocksAgo < 0) {
      this.logger.debug('Blocks ago is negative for mempool tx.');
      return;
    }

    if (blocksAgo >= this.unconfTX.length) {
      if (this.oldUnconfTX[bucketIndex] > 0) {
        this.oldUnconfTX[bucketIndex]--;
      } else {
        this.logger.debug('Mempool tx removed >25 blocks (bucket=%d).', bucketIndex);
      }
    } else {
      const blockIndex = entryHeight % this.unconfTX.length;
      if (this.unconfTX[blockIndex][bucketIndex] > 0) {
        this.unconfTX[blockIndex][bucketIndex]--;
      } else {
        this.logger.debug('Mempool tx removed (block=%d, bucket=%d).', blockIndex, bucketIndex);
      }
    }
    if(!inBlock && blocksAgo >= this.scale) {
      assert(this.scale != 0);
      let periodsAgo = blocksAgo / this.scale;
      for(let i = 0; i < periodsAgo && i < this.failAvg.length; i++)
        this.failAvg[i][bucketIndex]++;
    }
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;

    size += 12;

    size += sizeArray(this.buckets);
    size += sizeArray(this.avg);
    size += sizeArray(this.txAvg);
    size += encoding.sizeVarint(this.confAvg.length);

    for (let i = 0; i < this.confAvg.length; i++)
      size += sizeArray(this.confAvg[i]);

    size += encoding.sizeVarint(this.failAvg.length);

    for (let i = 0; i < this.failAvg.length; i++)
      size += sizeArray(this.failAvg[i]);

    return size;
  }

  getMaxConfirms() {
    return this.scale * this.confAvg.length;
  }

  /**
   * Serialize confirm stats.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    const bw = bio.write(size);

    bw.writeDouble(this.decay);
    bw.writeU16(this.scale);
    writeArray(bw, this.buckets);
    writeArray(bw, this.avg);
    writeArray(bw, this.txAvg);
    bw.writeVarint(this.confAvg.length);

    for (let i = 0; i < this.confAvg.length; i++)
      writeArray(bw, this.confAvg[i]);

    bw.writeVarint(this.failAvg.length);

    for (let i = 0; i < this.failAvg.length; i++)
      writeArray(bw, this.failAvg[i]);

    return bw.render();
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   * @returns {ConfirmStats}
   */

  fromRaw(data) {
    const br = bio.read(data);
    const decay = br.readDouble();
    const scale = br.readU16();
    const buckets = readArray(br);
    const avg = readArray(br);
    const txAvg = readArray(br);
    let maxConfirms = br.readVarint();
    //const maxConfirms = scale * maxPeriods;
    const confAvg = new Array(maxConfirms);

    for (let i = 0; i < maxConfirms; i++)
      confAvg[i] = readArray(br);

    let maxFails = br.readVarint();
    const failAvg = new Array(maxFails);

    for (let i = 0; i < maxFails; i++)
      failAvg[i] = readArray(br);

    if (decay <= 0 || decay >= 1)
      throw new Error('Decay must be between 0 and 1 (non-inclusive).');

    if (scale == 0)
      throw new Error('Scale must be non-zero');

    if (avg.length !== buckets.length)
      throw new Error('Mismatch in fee/pri average bucket count.');

    if (txAvg.length !== buckets.length)
      throw new Error('Mismatch in tx count bucket count.');

    let maxPeriods = confAvg.length;
    maxConfirms = scale * maxPeriods;

    if (maxConfirms <= 0 || maxConfirms > 6 * 24 * 7)
      throw new Error('Must maintain estimates for between 1-1008 confirms.');

    for (let i = 0; i < maxPeriods; i++) {
      if (confAvg[i].length !== buckets.length)
        throw new Error('Mismatch in fee/pri conf average bucket count.');
    }

    if (maxPeriods != failAvg.length)
      throw new Error('Mismatch in confirms tracked for failures.');

    for (let i = 0; i < maxPeriods; i++) {
      if (failAvg[i].length !== buckets.length)
        throw new Error('Mismatch in one of failure average bucket counts.');
    }    

    this.init(buckets, maxConfirms, decay, scale);

    //this.decay = decay;
    //this.scale = scale;
    this.avg = avg;
    this.txAvg = txAvg;
    this.confAvg = confAvg;
    this.failAvg = failAvg;

    // Resize the current block variables which aren't stored in the data file
    // to match the number of confirms and buckets
    //this.resizeInMemoryCounter(buckets.length);

    this.logger.debug('Reading estimates: %d buckets counting confirms up to %d blocks.',
      buckets.length, maxConfirms);

    return this;
  }

  /**
   * Instantiate confirm stats from serialized data.
   * @param {Buffer} data
   * @param {String} type
   * @param {Logger?} logger
   * @returns {ConfirmStats}
   */

  static fromRaw(data, type, logger) {
    return new this(type, logger).fromRaw(data);
  }
}

/**
 * Policy Estimator
 * Estimator for fees and priority.
 * @alias module:mempool.PolicyEstimator
 */

class PolicyEstimator {
  /**
   * Create an estimator.
   * @constructor
   * @param {Logger?} logger
   */

  constructor(logger) {
    this.logger = Logger.global;
    this.minTrackedFee = MIN_FEERATE;

    //Fee stats
    this.feeStats = new ConfirmStats('FeeRate');
    this.shortStats = new ConfirmStats('ShortStats');
    this.longStats = new ConfirmStats('LongStats');

    this.feeUnlikely = 0;
    this.feeLikely = INF_FEERATE;

    this.map = new BufferMap();
    this.bestHeight = 0;
    this.firstRecordedHeight = 0;
    this.historicalFirst = 0;
    this.historicalBest = 0;
    this.result = 0;
    this.tempResult = 0;
    this.trackedTxs = 0;
    this.untrackedTxs = 0;

    if (policy.MIN_RELAY >= MIN_FEERATE)
      this.minTrackedFee = policy.MIN_RELAY;

    assert(MIN_FEERATE > 0, "Min feerate must be nonzero");

    if (logger) {
      assert(typeof logger === 'object');
      this.logger = logger.context('fees');
      this.feeStats.logger = this.logger;
      this.shortStats.logger = this.logger;
      this.longStats.logger = this.logger;
    }
  }

  /**
   * Initialize the estimator.
   * @private
   */

  init() {
    const fee = [];

    for (let b = MIN_BUCKET_FEERATE; b <= MAX_BUCKET_FEERATE; b *= FEE_SPACING)
      fee.push(b);

    fee.push(INF_FEERATE);

    this.feeStats.init(fee, MED_BLOCK_PERIODS, MED_DECAY, MED_SCALE);
    this.shortStats.init(fee, SHORT_BLOCK_PERIODS, SHORT_DECAY, SHORT_SCALE);
    this.longStats.init(fee, LONG_BLOCK_PERIODS, LONG_DECAY, LONG_SCALE);
  }

  /**
   * Reset the estimator.
   */

  reset() {
    this.feeUnlikely = 0;
    this.feeLikely = INF_FEERATE;

    this.map.clear();
    this.bestHeight = 0;
    //this.firstRecordedHeight = 0;
    //this.historicalFirst = 0;
    //this.historicalBest = 0;

    this.init();
  }

  /**
   * Stop tracking a tx. Remove from map.
   * @param {Hash} hash
   */

  removeTX(hash, inBlock) {
    const item = this.map.get(hash);

    if (!item) {
      this.logger.spam('Mempool tx %h not found.', hash);
      return;
    }

    this.feeStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex, inBlock);
    this.shortStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex, inBlock);
    this.longStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex, inBlock);

    this.map.delete(hash);
  }

  /**
   * Test whether a fee should be used for calculation.
   * @param {Amount} fee
   * @returns {Boolean}
   */

  isFeePoint(fee) {
    if (fee >= MIN_BUCKET_FEERATE || fee > INF_FEERATE)
      return true;
  
    return false;
  }

  /**
   * Process a mempool entry.
   * @param {MempoolEntry} entry
   * @param {Boolean} current - Whether the chain is synced.
   */

  processTX(entry, current) {
    const height = entry.height;
    const hash = entry.hash();

    if (this.map.has(hash)) {
      this.logger.debug('Mempool tx %h already tracked.', entry.hash());
      return;
    }

    // Ignore reorgs.
    if (height < this.bestHeight || height != this.bestHeight)
      return;

    // Wait for chain to sync.
    if (!current) {
      this.untrackedTxs++;
      return;
    }
      
    this.trackedTxs++;

    // Requires other mempool txs in order to be confirmed. Ignore.
    //if (entry.dependencies)
    //  return;

    //const fee = entry.getFee();
    const rate = entry.getRate(); //fee rate

    this.logger.spam('Processing mempool tx %h.', entry.hash());

    const item = new StatEntry();
    item.blockHeight = height;
    const bucketIndex = this.feeStats.addTX(height, rate);
    item.bucketIndex = bucketIndex;
    const bucketIndex2 = this.shortStats.addTX(height, rate);
    assert(bucketIndex == bucketIndex2);
    const bucketIndex3 = this.longStats.addTX(height, rate);
    assert(bucketIndex == bucketIndex3);
    this.map.set(hash, item);
  }

  /**
   * Process an entry being removed from the mempool.
   * @param {Number} height - Block height.
   * @param {MempoolEntry} entry
   */

  processBlockTX(height, entry) {
    // Requires other mempool txs in order to be confirmed. Ignore.
    //if (entry.dependencies)
    //  return;
    if(!this.removeTX(entry.hash(), true)) {
      // This transaction wasn't being tracked for fee estimation
      return false;
    }

    const blocks = height - entry.height;

    if (blocks <= 0) {
      this.logger.debug(
        'Block tx %h had negative blocks to confirm (%d, %d).',
        entry.hash(),
        height,
        entry.height);
      return;
    }

    const rate = entry.getRate();

    this.feeStats.record(blocks, rate);
    this.shortStats.record(blocks, rate);
    this.longStats.record(blocks, rate);

    return true;
    
  }

  /**
   * Process a block of transaction entries being removed from the mempool.
   * @param {Number} height - Block height.
   * @param {MempoolEntry[]} entries
   * @param {Boolean} current - Whether the chain is synced.
   */

  processBlock(height, entries, current) {
    // Ignore reorgs.
    if (height <= this.bestHeight)
      return;

    this.bestHeight = height;

    if (entries.length === 0)
      return;

    // Wait for chain to sync.
    if (!current)
      return;

    this.logger.debug('Recalculating dynamic cutoffs.');

    // Update unconfirmed circular buffer
    this.feeStats.clearCurrent(height);
    this.shortStats.clearCurrent(height);
    this.longStats.clearCurrent(height);

    // Decay all exponential averages
    this.feeStats.updateAverages();
    this.shortStats.updateAverages();
    this.longStats.updateAverages();

    let countedTxs = 0;

    for (const entry of entries) {
      if(this.processBlockTX(height, entry))
        countedTxs++;
    }

    if(this.firstRecordedHeight == 0 && countedTxs > 0) {
      this.firstRecordedHeight = this.bestHeight;
      this.logger.debug('Blockpolicy first recorded height: %d.', this.firstRecordedHeight);
    }

    this.logger.debug('Blockpolicy estimates updated by %d of %d block txs, since last block %d of %d tracked, mempool map size %d, max target %d from %s',
      countedTxs, entries.length, this.trackedTxs, this.trackedTxs + this.untrackedTxs, this.map.size,
      this.maxUsableEstimate(), this.historicalBlockSpan() > this.blockSpan() ? "historical" : "current");

    this.logger.debug('New fee rate: %d.', this.estimateFee(6, false, false));

    this.trackedTxs = 0;
    this.untrackedTxs = 0;
  }

  /**
   * Estimate a fee rate.
   * @param {Number} [target=6] - Confirmation target.
   * @param {Boolean} [smart=true] - Smart estimation.
   * @param {Boolean} [conservative=true] - Conservative estimation.
   * @returns {Rate}
   */

  estimateFee(target, smart, conservative) {
    if (!target)
      target = 1;

    if(smart == null)
      smart = true;

    if(conservative == null)
      conservative = true;

    if (smart == true)
      return this.estimateSmartFee(target, null, conservative);

    if(conservative == true)
      return this.estimateConservativeFee(target);

    target = 6;

    return this.estimateRawFee(target, DOUBLE_SUCCESS_PCT, ESTIMATE_HORIZON['MED_HALFLIFE']);
  }

  estimateRawFee(target, successThreshold, horizon, result) {
    let stats;
    let sufficientTxs = SUFFICIENT_FEETXS;
    let horizonArr = ESTIMATE_HORIZON;
    let median;

    switch(horizon) {
      case horizonArr['SHORT_HALFLIFE']:
        stats = this.shortStats;
        sufficientTxs = SUFFICIENT_TXS_SHORT;
        break;
      case horizonArr['MED_HALFLIFE']:
        stats = this.feeStats;
        break;
      case horizonArr['LONG_HALFLIFE']:
        stats = this.longStats;
        break;
      default:
        throw new Error("CBlockPolicyEstimator::estimateRawFee unknown FeeEstimateHorizon");
    }

    if(target <= 0 || target > stats.getMaxConfirms())
      return 0;
    if(successThreshold > 1)
      return 0;

    median = stats.estimateMedian(target, sufficientTxs, successThreshold, true, this.bestHeight, result);

    console.log("estimateRawfee", median);

    if(median < 0)
      return 0;

    return median;
  }

  highestTargetTracked(horizon) {
    switch(horizon) {
      case ESTIMATE_HORIZON['SHORT_HALFLIFE']:
        return this.shortStats.getMaxConfirms();
      case ESTIMATE_HORIZON['MED_HALFLIFE']:
        return this.feeStats.getMaxConfirms();
      case ESTIMATE_HORIZON['LONG_HALFLIFE']:
        return this.longStats.getMaxConfirms();
      default:
        throw new Error("CBlockPolicyEstimator::HighestTargetTracked unknown FeeEstimateHorizon");
    }
  }

  blockSpan() {
    if(this.firstRecordedHeight == 0)
      return 0;
    assert(this.bestHeight >= this.firstRecordedHeight);
    return this.bestHeight - this.firstRecordedHeight;
  }

  historicalBlockSpan() {
    if (this.historicalFirst == 0)
      return 0;
    assert(this.historicalBest >= this.historicalFirst);
    if(this.bestHeight - this.historicalBest > OLDEST_ESTIMATE_HISTORY)
      return 0;
    return this.historicalBest - this.historicalFirst;
  }

  maxUsableEstimate() {
    // Block spans are divided by 2 to make sure there are enough potential failing data points for the estimate
    return Math.min(this.longStats.getMaxConfirms(), Math.max(this.blockSpan(), this.historicalBlockSpan()) / 2);
  }

/** 
 * Return a fee estimate at the required successThreshold from the shortest
 * time horizon which tracks confirmations up to the desired target.  If
 * checkShorterHorizon is requested, also allow short time horizon estimates
 * for a lower target to reduce the given answer 
 */

  estimateCombinedFee(target, successThreshold, checkShorterHorizon, result) {
    let estimate = -1;
    if(target >= 1 && target <= this.longStats.getMaxConfirms()) {
      if(target <= this.shortStats.getMaxConfirms())
        estimate = this.shortStats.estimateMedian(target, SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight, result);
      else if(target <= this.feeStats.getMaxConfirms())
        estimate = this.feeStats.estimateMedian(target, SUFFICIENT_FEETXS, successThreshold, true, this.bestHeight, result);
      else
        estimate = this.longStats.estimateMedian(target, SUFFICIENT_FEETXS, successThreshold, true, this.bestHeight, result);

      if(checkShorterHorizon) {
        //let tempResult = estimationResult;
        if(target > this.feeStats.getMaxConfirms()) {
          let medMax = this.feeStats.estimateMedian(this.feeStats.getMaxConfirms(), SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight);
          if(medMax > 0 && (estimate == -1 || medMax < estimate)) {
            estimate = medMax;
            //this.tempResult = medMax;
          }
        }
        if(target > this.shortStats.getMaxConfirms()) {
          let shortMax = this.shortStats.estimateMedian(this.shortStats.getMaxConfirms(), SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight);
          if (shortMax > 0 && (estimate == -1 | shortMax < estimate)) {
            estimate = shortMax;
            //this.tempResult = shortMax;
          }
        }
      }
    }
    return estimate;
  }

/** 
 * Ensure that for a conservative estimate, the DOUBLE_SUCCESS_PCT is also met
 * at 2 * target for any longer time horizons.
 */

  estimateConservativeFee(target, result) {
    let estimate = -1;
    //let tempResult = estimationResult;
    if(target <= this.shortStats.getMaxConfirms()) {
      estimate = this.feeStats.estimateMedian(target, SUFFICIENT_FEETXS, DOUBLE_SUCCESS_PCT, true, this.bestHeight);
    }
    if(target <= this.feeStats.getMaxConfirms()) {
      let longEstimate = this.longStats.estimateMedian(target, SUFFICIENT_FEETXS, DOUBLE_SUCCESS_PCT, true, this.bestHeight);
      if(longEstimate > estimate) {
        estimate = longEstimate;
        //this.tempResult = longEstimate;
      }
    }
    return estimate;
  }

  estimateSmartFee(target, feeCalc, conservative) {
    let feeCalcObj = feeCalculation;
    if(feeCalc != null) {
      feeCalcObj.desiredTarget = target;
      feeCalcObj.returnedTarget = target;
    }

    let median = -1;
    let tempResult = estimationResult;

    if(target <= 0 || target > this.longStats.getMaxConfirms())
      return 0;

    if(target == 1)
      target = 2;

    if(target > this.maxUsableEstimate())
      target = this.maxUsableEstimate();

    if(feeCalc != null)
      feeCalcObj.returnedTarget = target;

    console.log("estimatesmartfee ", median);

    if(target <= 1)
      return 0;

    assert(target > 0);

    /** 
     * true is passed to estimateCombined fee for target/2 and target so
     * that we check the max confirms for shorter time horizons as well.
     * This is necessary to preserve monotonically increasing estimates.
     * For non-conservative estimates we do the same thing for 2*target, but
     * for conservative estimates we want to skip these shorter horizons
     * checks for 2*target because we are taking the max over all time
     * horizons so we already have monotonically increasing estimates and
     * the purpose of conservative estimates is not to let short term
     * fluctuations lower our estimates by too much.
     */

    let halfEst = this.estimateCombinedFee(target/2, HALF_SUCCESS_PCT, true);
    //tempResult = halfEst;
    median = halfEst;
    if(feeCalc != null) {
      feeCalcObj.est = tempResult;
      feeCalcObj.reason = REASON.HALF_ESTIMATE;
    }

    let actualEst = this.estimateCombinedFee(target, SUCCESS_PCT, true);
    //tempResult = actualEst;
    if(actualEst > median) {
      median = actualEst;
      if(feeCalc != null) {
        feeCalcObj.est = tempResult;
        feeCalcObj.reason = REASON.FULL_ESTIMATE;
      }
    }

    let doubleEst = this.estimateCombinedFee(2 * target, DOUBLE_SUCCESS_PCT, !conservative);
    //tempResult = doubleEst;
    if(doubleEst > median) {
      median = doubleEst;
      if(feeCalc != null) {
        feeCalcObj.est = tempResult;
        feeCalcObj.reason = REASON.DOUBLE_ESTIMATE;
      }
    }

    if(conservative || median == -1) {
      let consEst = this.estimateConservativeFee(2 * target);
      if(consEst > median) {
        median = consEst;
        if(feeCalc != null) {
          feeCalcObj.est = tempResult;
          feeCalcObj.reason = REASON.CONSERVATIVE;
        }
      }
    }

    console.log("estimatesmartfee ", median);

    if(median < 0)
      return 0;

    return median;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += 5; //version, bestheight
    size += 8; //historical first, historical best
    size += encoding.sizeVarlen(this.feeStats.getSize());
    size += encoding.sizeVarlen(this.shortStats.getSize());
    size += encoding.sizeVarlen(this.longStats.getSize());
    return size;
  }

  /**
   * Serialize the estimator.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    const bw = bio.write(size);

    bw.writeU8(PolicyEstimator.VERSION);
    bw.writeU32(this.bestHeight);
    if(this.blockSpan() > this.historicalBlockSpan()/2) {
      bw.writeU32(this.firstRecordedHeight);
      bw.writeU32(this.bestHeight);
    } else {
      bw.writeU32(this.historicalFirst);
      bw.writeU32(this.historicalBest);
    }
    bw.writeVarBytes(this.feeStats.toRaw());
    bw.writeVarBytes(this.shortStats.toRaw());
    bw.writeVarBytes(this.longStats.toRaw());

    return bw.render();
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   * @returns {PolicyEstimator}
   */

  fromRaw(data) {
    const br = bio.read(data);

    if (br.readU8() !== PolicyEstimator.VERSION)
      throw new Error('Bad serialization version for estimator.');

    this.bestHeight = br.readU32();
    this.historicalFirst = br.readU32();
    this.historicalBest = br.readU32();
    if(this.historicalFirst > this.historicalBest || this.historicalBest > this.bestHeight) {
      throw new Error('Corrupt estimates file. Historical block range for estimates is invalid');
    }
    this.feeStats.fromRaw(br.readVarBytes());
    this.shortStats.fromRaw(br.readVarBytes());
    this.longStats.fromRaw(br.readVarBytes());

    return this;
  }

  /**
   * Instantiate a policy estimator from serialized data.
   * @param {Buffer} data
   * @param {Logger?} logger
   * @returns {PolicyEstimator}
   */

  static fromRaw(data, logger) {
    return new this(logger).fromRaw(data);
  }

  /**
   * Inject properties from estimator.
   * @param {PolicyEstimator} estimator
   * @returns {PolicyEstimator}
   */

  inject(estimator) {
    this.bestHeight = estimator.bestHeight;
    this.historicalFirst = estimator.historicalFirst;
    this.historicalBest = estimator.historicalBest;
    //this.firstRecordedHeight = estimator.firstRecordedHeight;
    this.feeStats = estimator.feeStats;
    this.shortStats = estimator.shortStats;
    this.longStats = estimator.longStats;
    return this;
  }
}

/**
 * Serialization version.
 * @const {Number}
 * @default
 */

PolicyEstimator.VERSION = 0;

/**
 * Stat Entry
 * @alias module:mempool.StatEntry
 * @ignore
 */

class StatEntry {
  /**
   * StatEntry
   * @constructor
   */

  constructor() {
    this.blockHeight = -1;
    this.bucketIndex = -1;
  }
}

/**
 * Double Map
 * @alias module:mempool.DoubleMap
 * @ignore
 */

class DoubleMap {
  /**
   * DoubleMap
   * @constructor
   */

  constructor() {
    this.buckets = [];
  }

  insert(key, value) {
    const i = binary.search(this.buckets, key, compare, true);
    this.buckets.splice(i, 0, [key, value]);
  }

  search(key) {
    assert(this.buckets.length !== 0, 'Cannot search.');
    const i = binary.search(this.buckets, key, compare, true);
    return this.buckets[i][1];
  }
}

/*
 * Helpers
 */

function compare(a, b) {
  return a[0] - b;
}

function sizeArray(buckets) {
  const size = encoding.sizeVarint(buckets.length);
  return size + buckets.length * 8;
}

function writeArray(bw, buckets) {
  bw.writeVarint(buckets.length);

  for (let i = 0; i < buckets.length; i++)
    bw.writeDouble(buckets[i]);
}

function readArray(br) {
  const buckets = new Float64Array(br.readVarint());

  for (let i = 0; i < buckets.length; i++)
    buckets[i] = br.readDouble();

  return buckets;
}

/*
 * Expose
 */

module.exports = PolicyEstimator;
