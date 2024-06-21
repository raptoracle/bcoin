/*!
 * fees.js - fee estimation for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 * Ported from:
 * https://github.com/bitcoin/bitcoin/blob/master/src/policy/fees.cpp
 */

'use strict';

const assert = require('bsert');
const bio = require('bufio');
const Logger = require('blgr');
const {BufferMap} = require('buffer-map');
const binary = require('../utils/binary');
const {consensus, policy} = require('../protocol/params');
const {encoding} = bio;

/*
 * Constants
 */

const MAX_BLOCK_CONFIRMS = policy.feeConstants.MAX_BLOCK_CONFIRMS;
const DEFAULT_DECAY = policy.feeConstants.DEFAULT_DECAY;
const MIN_SUCCESS_PCT = policy.feeConstants.MIN_SUCCESS_PCT;
const UNLIKELY_PCT = policy.feeConstants.UNLIKELY_PCT;
const SUFFICIENT_FEETXS = policy.feeConstants.SUFFICIENT_FEETXS;
const SUFFICIENT_PRITXS = policy.feeConstants.SUFFICIENT_PRITXS;
const MIN_FEERATE = policy.feeConstants.MIN_FEERATE;
const MAX_FEERATE = policy.feeConstants.MAX_FEERATE;
const INF_FEERATE = policy.feeConstants.INF_FEERATE;
const MIN_PRIORITY = policy.feeConstants.MIN_PRIORITY;
const MAX_PRIORITY = policy.feeConstants.MAX_PRIORITY;
const INF_PRIORITY = policy.feeConstants.INF_PRIORITY;
const FEE_SPACING = policy.feeConstants.FEE_SPACING;
const PRI_SPACING = policy.feeConstants.PRI_SPACING;

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
    this.maxConfirms = 0;

    this.buckets = new Float64Array(0);
    this.passBucket = new DoubleMap();
    this.failBucket = new DoubleMap();
    this.bucketMap = new DoubleMap();

    this.confAvg = [];
    this.curBlockConf = [];
    this.unconfTX = [];

    this.failAvg = [];

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
    this.curBlockConf = new Array(maxConfirms);
    this.unconfTX = new Array(maxConfirms);
    this.failAvg = new Array(maxConfirms);

    for (let i = 0; i < maxConfirms; i++) {
      this.confAvg[i] = new Float64Array(buckets.length);
      this.curBlockConf[i] = new Int32Array(buckets.length);
      this.unconfTX[i] = new Int32Array(buckets.length);
      this.failAvg[i] = new Int32Array(buckets.length);
    }

    this.oldUnconfTX = new Int32Array(buckets.length);
    this.curBlockTX = new Int32Array(buckets.length);
    this.txAvg = new Float64Array(buckets.length);
    this.curBlockVal = new Float64Array(buckets.length);
    this.avg = new Float64Array(buckets.length);
  }

  /**
   * Clear data for the current block.
   * @param {Number} height
   */

  clearCurrent(height) {
    for (let i = 0; i < this.buckets.length; i++) {
      this.oldUnconfTX[i] = this.unconfTX[height % this.unconfTX.length][i];
      this.unconfTX[height % this.unconfTX.length][i] = 0;
      for (let j = 0; j < this.curBlockConf.length; j++)
        this.curBlockConf[j][i] = 0;
      this.curBlockTX[i] = 0;
      this.curBlockVal[i] = 0;
    }
  }

  /**
   * Record a rate or priority based on number of blocks to confirm.
   * @param {Number} blocks - Blocks to confirm.
   * @param {Rate|Number} val - Rate or priority.
   */

  record(blocks, val) {
    if (blocks < 1)
      return;

    const periodsToConfirm = (blocks + this.scale - 1) / this.scale;

    const bucketIndex = this.bucketMap.search(val);

    for (let i = periodsToConfirm; i <= this.curBlockConf.length; i++)
      this.curBlockConf[i - 1][bucketIndex]++;

    this.curBlockTX[bucketIndex]++;
    this.curBlockVal[bucketIndex] += val;
  }

  /**
   * Update moving averages.
   */

  updateAverages() {
    for (let i = 0; i < this.buckets.length; i++) {
      for (let j = 0; j < this.confAvg.length; j++) 
        this.confAvg[j][i] = this.confAvg[j][i] * this.decay; // + this.curBlockConf[j][i]
      for (let f = 0; f < this.failAvg.length; f++) 
        this.failAvg[f][i] = this.failAvg[f][i] * this.decay; // + this.curBlockConf[j][i]      
      this.avg[i] = this.avg[i] * this.decay; // + this.curBlockVal[i];
      this.txAvg[i] = this.txAvg[i] * this.decay; // + this.curBlockTX[i];
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

  estimateMedian(target, needed, breakpoint, greater, height) {
    const max = this.buckets.length - 1;
    const start = greater ? max : 0;
    const step = greater ? -1 : 1;
    const bins = this.unconfTX.length;
    let conf = 0;
    let total = 0;
    let extra = 0;
    let fail = 0;
    let near = start;
    let far = start;
    let bestNear = start;
    let bestFar = start;
    let newBucketRange = true;
    let found = false;
    let median = -1;
    let sum = 0;
    let passing = true;
    let periodTarget = (target + this.scale - 1)/this.scale;
    this.result = {};

    for (let i = start; i >= 0 && i <= max; i += step) {
      if(newBucketRange) {
        near = i;
        newBucketRange = false;
      }
      far = i;
      conf += this.confAvg[periodTarget - 1][i];
      fail += this.failAvg[periodTarget - 1][i];
      total += this.txAvg[i];

      for (let j = target; j < this.maxConfirms; j++)
        extra += this.unconfTX[Math.max(height - j, 0) % bins][i];

      extra += this.oldUnconfTX[i];

      if (total >= needed / (1 - this.decay)) {
        const perc = conf / (total + fail + extra);

        if (greater && perc < breakpoint || (!greater && perc > breakpoint)) {
          if(passing == true) {
            let failMinBucket = Math.min(near, far);
            let failMaxBucket = Math.max(near, far);
            this.failBucket.insert('start', failMinBucket ? this.buckets[failMinBucket - 1] : 0);
            this.failBucket.insert('end', this.buckets[failMaxBucket]);
            this.failBucket.insert('withinTarget', conf);
            this.failBucket.insert('totalConfirmed', total);
            this.failBucket.insert('inMempool', extra);
            this.failBucket.insert('leftMempool', fail);
            passing = false;
          }
          continue;
        } else {
          failBucket = new DoubleMap();
          found = true;
          passing = true;
          this.passBucket.insert('withinTarget', conf);
          conf = 0;
          this.passBucket.insert('totalConfirmed', total);
          total = 0;
          this.passBucket.insert('inMempool', extra);
          extra = 0;
          this.passBucket.insert('leftMempool', fail);
          fail = 0;
          bestNear = near;
          bestFar = far;
          near = i + step;
          newBucketRange = true;
        }
      }
    }

    const minBucket = bestNear < bestFar ? bestNear : bestFar;
    const maxBucket = bestNear > bestFar ? bestNear : bestFar;

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

      this.passBucket.insert('start', minBucket ? this.buckets[minBucket-1] : 0);
      this.passBucket.insert('end', this.buckets[maxBucket]);
    }

    if(passing && !newBucketRange) {
      let failMinBucket = Math.min(near, far);
      let failMaxBucket = Math.max(near, far);
      this.failBucket.insert('start', failMinBucket ? this.buckets[failMinBucket - 1] : 0);
      this.failBucket.insert('end', this.buckets[failMaxBucket]);
      this.failBucket.insert('withinTarget', conf);
      this.failBucket.insert('totalConfirmed', total);
      this.failBucket.insert('inMempool', extra);
      this.failBucket.insert('leftMempool', fail);
    }

    if(result) {
      this.result = {
        pass: this.passBucket,
        fail: this.failBucket,
        decay: this.decay,
        scale: this.scale,
      };
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
        this.logger.debug('Mempool tx removed >25 blocks (bucket=%d).',
          bucketIndex);
      }
    } else {
      const blockIndex = entryHeight % this.unconfTX.length;
      if (this.unconfTX[blockIndex][bucketIndex] > 0) {
        this.unconfTX[blockIndex][bucketIndex]--;
      } else {
        this.logger.debug('Mempool tx removed (block=%d, bucket=%d).',
         blockIndex, bucketIndex);
      }
    }
    if(!inBlock && blocksAgo >= this.scale) {
      assert(this.scale != 0);
      let periodsAgo = blocksAgo/this.scale;
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

    size += 16;

    //size += sizeArray(this.buckets);
    size += sizeArray(this.avg);
    size += sizeArray(this.txAvg);
    size += sizeArray(this.confAvg);
    size += sizeArray(this.failAvg);

    //size += encoding.sizeVarint(this.maxConfirms);

    //for (let i = 0; i < this.maxConfirms; i++)
    //  size += sizeArray(this.confAvg[i]);

    return size;
  }

  /**
   * Serialize confirm stats.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    const bw = bio.write(size);

    bw.writeDouble(this.decay);
    bw.writeDouble(this.scale);
    writeArray(bw, this.buckets);
    writeArray(bw, this.avg);
    writeArray(bw, this.txAvg);
    writeArray(bw, this.confAvg);
    writeArray(bw, this.failAvg);
    //bw.writeVarint(this.maxConfirms);

    //for (let i = 0; i < this.maxConfirms; i++)
    //  writeArray(bw, this.confAvg[i]);

    return bw.render();
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   * @returns {ConfirmStats}
   */

  fromRaw(data) {
    let maxPeriods, maxConfirms;
    const br = bio.read(data);
    const decay = br.readDouble();
    if (decay <= 0 || decay >= 1)
      throw new Error('Decay must be between 0 and 1 (non-inclusive).');

    const scale = br.readDouble();
    if (scale == 0)
      throw new Error('Corrupt estimates file. Scale must be non-zero.');

    const buckets = readArray(br);
    if (buckets.length <= 1 || buckets.length > 1000)
      throw new Error('Must have between 2 and 1000 fee/pri buckets.');

    const avg = readArray(br);
    if (avg.length !== buckets.length)
      throw new Error('Mismatch in fee/pri average bucket count.');

    const txAvg = readArray(br);
    if (txAvg.length !== buckets.length)
      throw new Error('Mismatch in tx count bucket count.');

    const confAvg = readArray(br);
    maxPeriods = confAvg.length;
    maxConfirms = scale * maxPeriods;

    if(maxConfirms <= 0 || maxConfirms > 6 * 24 * 7)
      throw new Error('Must maintain estimates for between 1-1008 confirms.');
    
    for (let i = 0; i < maxPeriods; i++) {
      if(confAvg[i].length != buckets.length)
        throw new Error('Mismatch in fee/pri conf average bucket count.');
    }
      
    const failAvg = readArray(br);
    if (maxPeriods != failAvg.length)
      throw new Error('Corrupt estimates file. Mismatch in confirms tracked for failures');

    for (let i = 0; i < maxPeriods; i++) {
      if(failAvg[i].length != buckets.length)
        throw new Error('Corrupt estimates file. Mismatch in one of failure average bucket counts');
    }

    this.init(buckets, maxConfirms, decay, scale);

    this.avg = avg;
    this.txAvg = txAvg;
    this.confAvg = confAvg;

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
    this.minTrackedPri = MIN_PRIORITY;

    //Fee stats
    this.feeStats = new ConfirmStats('FeeRate');
    this.shortStats = new ConfirmStats('ShortStats');
    this.longStats = new ConfirmStats('LongStats');

    //Priority
    this.priStats = new ConfirmStats('Priority');

    this.feeUnlikely = 0;
    this.feeLikely = INF_FEERATE;
    this.priUnlikely = 0;
    this.priLikely = INF_PRIORITY;

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

    if (policy.FREE_THRESHOLD >= MIN_PRIORITY)
      this.minTrackedPri = policy.FREE_THRESHOLD;

    if (logger) {
      assert(typeof logger === 'object');
      this.logger = logger.context('fees');
      this.feeStats.logger = this.logger;
      this.shortStats.logger = this.logger;
      this.longStats.logger = this.logger;
      this.priStats.logger = this.logger;
    }
  }

  /**
   * Initialize the estimator.
   * @private
   */

  init() {
    const pConstants = policy.feeConstants;
    const minFee = this.minTrackedFee;
    const minPri = this.minTrackedPri;

    const fee = [];

    for (let b = pConstants.MIN_BUCKET_FEERATE; b <= pConstants.MAX_BUCKET_FEERATE; b *= pConstants.FEE_SPACING)
      fee.push(b);

    fee.push(pConstants.INF_FEERATE);

    const priority = [];

    for (let b = minPri; b <= MAX_PRIORITY; b *= PRI_SPACING)
      priority.push(b);

    priority.push(INF_PRIORITY);

    //this.feeStats.init(fee, MAX_BLOCK_CONFIRMS, DEFAULT_DECAY);
    // Fees

    this.feeStats.init(fee, pConstants.MED_BLOCK_PERIODS, pConstants.MED_DECAY, pConstants.MED_SCALE);
    this.shortStats.init(fee, pConstants.SHORT_BLOCK_PERIODS, pConstants.SHORT_DECAY, pConstants.SHORT_SCALE);
    this.longStats.init(fee, pConstants.LONG_BLOCK_PERIODS, pConstants.LONG_DECAY, pConstants.LONG_SCALE);

    // Priority
    this.priStats.init(priority, MAX_BLOCK_CONFIRMS, DEFAULT_DECAY);
  }

  /**
   * Reset the estimator.
   */

  reset() {
    this.feeUnlikely = 0;
    this.feeLikely = INF_FEERATE;
    this.priUnlikely = 0;
    this.priLikely = INF_PRIORITY;

    this.map.clear();
    this.bestHeight = 0;
    this.firstRecordedHeight = 0;
    this.historicalFirst = 0;
    this.historicalBest = 0;

    this.init();
  }

  /**
   * Stop tracking a tx. Remove from map.
   * @param {Hash} hash
   */

  removeTX(hash) {
    const item = this.map.get(hash);

    if (!item) {
      this.logger.spam('Mempool tx %h not found.', hash);
      return;
    }

    this.feeStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex);
    this.shortStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex);
    this.longStats.removeTX(item.blockHeight, this.bestHeight, item.bucketIndex);

    this.map.delete(hash);
  }

  /**
   * Test whether a fee should be used for calculation.
   * @param {Amount} fee
   * @param {Number} priority
   * @returns {Boolean}
   */

  isFeePoint(fee, priority) {
    if ((priority < this.minTrackedPri && fee >= this.minTrackedFee)
        || (priority < this.priUnlikely && fee > this.feeLikely)) {
      return true;
    }
    return false;
  }

  /**
   * Test whether a priority should be used for calculation.
   * @param {Amount} fee
   * @param {Number} priority
   * @returns {Boolean}
   */

  isPriPoint(fee, priority) {
    if ((fee < this.minTrackedFee && priority >= this.minTrackedPri)
        || (fee < this.feeUnlikely && priority > this.priLikely)) {
      return true;
    }
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
    if (height < this.bestHeight)
      return;

    // Wait for chain to sync.
    if (!current)
      return;

    // Requires other mempool txs in order to be confirmed. Ignore.
    if (entry.dependencies)
      return;

    const fee = entry.getFee();
    const rate = entry.getRate(); //fee rate
    const priority = entry.getPriority(height);

    this.logger.spam('Processing mempool tx %h.', entry.hash());

    if (fee === 0 || this.isPriPoint(rate, priority)) {
      const item = new StatEntry();
      item.blockHeight = height;
      item.bucketIndex = this.priStats.addTX(height, priority);
      this.map.set(hash, item);
    } else if (this.isFeePoint(rate, priority)) {
      const item = new StatEntry();
      item.blockHeight = height;
      item.bucketIndex = this.feeStats.addTX(height, rate);
      item.bucketIndex2 = this.shortStats.addTX(height, rate);
      assert(item.bucketIndex == item.bucketIndex2);
      item.bucketIndex3 = this.longStats.addTX(height, rate);
      assert(item.bucketIndex == item.bucketIndex3);
      this.map.set(hash, item);
    } else {
      this.logger.spam('Not adding tx %h.', entry.hash());
    }
  }

  /**
   * Process an entry being removed from the mempool.
   * @param {Number} height - Block height.
   * @param {MempoolEntry} entry
   */

  processBlockTX(height, entry) {
    // Requires other mempool txs in order to be confirmed. Ignore.
    if (entry.dependencies)
      return;

    const blocks = height - entry.height;

    if (blocks <= 0) {
      this.logger.debug(
        'Block tx %h had negative blocks to confirm (%d, %d).',
        entry.hash(),
        height,
        entry.height);
      return;
    }

    const fee = entry.getFee();
    const rate = entry.getRate();
    const priority = entry.getPriority(height);

    if (fee === 0 || this.isPriPoint(rate, priority)) {
      this.priStats.record(blocks, priority);
    } else if (this.isFeePoint(rate, priority)) {
      this.feeStats.record(blocks, rate);
      this.shortStats.record(blocks, rate);
      this.longStats.record(blocks, rate);
    }
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
    this.priStats.clearCurrent(height);

    // Decay all exponential averages
    this.feeStats.updateAverages();
    this.shortStats.updateAverages();
    this.longStats.updateAverages();
    this.priStats.updateAverages();

    let countedTxs = 0;

    for (const entry of entries) {
      if(this.processBlockTX(height, entry))
        countedTxs++;
    }

    if(this.firstRecordedHeight == 0 && countedTxs > 0) {
      this.firstRecordedHeight = this.bestHeight;
      this.logger.debug('Blockpolicy first recorded height: %d.', this.firstRecordedHeight);
    }
      
    this.trackedTxs = 0;
    this.untrackedTxs = 0;

/*
    this.feeLikely = this.feeStats.estimateMedian(
      2, SUFFICIENT_FEETXS, MIN_SUCCESS_PCT,
      true, height);

    if (this.feeLikely === -1)
      this.feeLikely = INF_FEERATE;

    this.feeUnlikely = this.feeStats.estimateMedian(
      10, SUFFICIENT_FEETXS, UNLIKELY_PCT,
      false, height);

    if (this.feeUnlikely === -1)
      this.feeUnlikely = 0;

    this.priLikely = this.priStats.estimateMedian(
      2, SUFFICIENT_PRITXS, MIN_SUCCESS_PCT,
      true, height);

    if (this.priLikely === -1)
      this.priLikely = INF_PRIORITY;

    this.priUnlikely = this.priStats.estimateMedian(
      10, SUFFICIENT_PRITXS, UNLIKELY_PCT,
      false, height);

    if (this.priUnlikely === -1)
      this.priUnlikely = 0;

    this.feeStats.clearCurrent(height);
    this.priStats.clearCurrent(height);





    this.logger.debug('Done updating estimates'
      + ' for %d confirmed entries. New mempool map size %d.',
      entries.length, this.map.size);

    this.logger.debug('New fee rate: %d.', this.estimateFee());
*/
  }

  /**
   * Estimate a fee rate.
   * @param {Number} [target=1] - Confirmation target.
   * @param {Boolean} [smart=true] - Smart estimation.
   * @returns {Rate}
   */

  estimateFee(target, smart, conservative) {
    if (!target)
      target = 1;

    if(conservative == null)
      conservative = true;

    if(smart)
      return this.estimateSmartFee(target, null, conservative);

    return this.estimateRawFee(target, policy.feeConstants.DOUBLE_SUCCESS_PCT, policy.feeConstants.ESTIMATE_HORIZON['MED_HALFLIFE']);

/*
    if (!target)
      target = 1;

    if (smart == null)
      smart = true;

    assert((target >>> 0) === target, 'Target must be a number.');
    assert(target <= this.feeStats.maxConfirms,
      'Too many confirmations for estimate.');

    if (!smart) {
      const rate = this.feeStats.estimateMedian(
        target, SUFFICIENT_FEETXS, MIN_SUCCESS_PCT,
        true, this.bestHeight);

      if (rate < 0)
        return 0;

      return Math.floor(rate);
    }

    let rate = -1;
    while (rate < 0 && target <= this.feeStats.maxConfirms) {
      rate = this.feeStats.estimateMedian(
        target++, SUFFICIENT_FEETXS, MIN_SUCCESS_PCT,
        true, this.bestHeight);
    }

    target -= 1;

    if (rate < 0)
      return 0;

    return Math.floor(rate);
*/
  }

  estimateRawFee(target, successThreshold, horizon) {
    const constants = policy.feeConstants;
    let stats;
    let sufficientTxs = constants.SUFFICIENT_FEETXS;
    let horizonArr = constants.ESTIMATE_HORIZON;
    let median;

    switch(horizon) {
      case horizonArr['SHORT_HALFLIFE']:
        stats = this.shortStats;
        sufficientTxs = constants.SUFFICIENT_TXS_SHORT;
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

    if(target <= 0 || target > stats.maxConfirms)
      return 0;
    if(successThreshold > 1)
      return 0;

    median = stats.estimateMedian(
      target, sufficientTxs, successThreshold,
      true, this.bestHeight);

    if(median < 0)
      return 0;

    console.log("fee.js 829 says ", median);

    return Math.floor(median);
  }

  highestTargetTracked(horizon) {
    const constants = policy.feeConstants;
    let horizonArr = constants.ESTIMATE_HORIZON;

    switch(horizon) {
      case horizonArr['SHORT_HALFLIFE']:
        return this.shortStats.maxConfirms;
      case horizonArr['MED_HALFLIFE']:
        return this.feeStats.maxConfirms;
      case horizonArr['LONG_HALFLIFE']:
        return this.longStats.maxConfirms;
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
    if(this.bestHeight - this.historicalBest > policy.feeConstants.OLDEST_ESTIMATE_HISTORY)
      return 0;
    return this.historicalBest - this.historicalFirst;
  }

  maxUsableEstimate() {
    // Block spans are divided by 2 to make sure there are enough potential failing data points for the estimate
    return Math.min(this.longStats.maxConfirms, Math.max(this.blockSpan(), this.historicalBlockSpan()) / 2);
  }

  /** Return a fee estimate at the required successThreshold from the shortest
 * time horizon which tracks confirmations up to the desired target.  If
 * checkShorterHorizon is requested, also allow short time horizon estimates
 * for a lower target to reduce the given answer */

  estimateCombinedFee(target, successThreshold, checkShorterHorizon) {
    const constants = policy.feeConstants;
    let estimate = -1;
    if(target >= 1 && target <= this.longStats.maxConfirms) {
      if(target <= this.shortStats.maxConfirms)
        estimate = this.shortStats.estimateMedian(target, constants.SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight);
      else if(target <= this.feeStats.maxConfirms)
        estimate = this.feeStats.estimateMedian(target, constants.SUFFICIENT_FEETXS, successThreshold, true, this.bestHeight);
      else
        estimate = this.longStats.estimateMedian(target, constants.SUFFICIENT_FEETXS, successThreshold, true, this.bestHeight);

      if(checkShorterHorizon) {
        if(target > this.feeStats.maxConfirms) {
          let medMax = this.feeStats.estimateMedian(this.feeStats.maxConfirms, constants.SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight);
          if(medMax > 0 && (estimate == -1 || medMax < estimate)) {
            estimate = medMax;
            this.tempResult = medMax;
          }
        }
        if(target > this.shortStats.maxConfirms) {
          let shortMax = this.shortStats.estimateMedian(this.shortStats.maxConfirms, constants.SUFFICIENT_TXS_SHORT, successThreshold, true, this.bestHeight);
          if (shortMax > 0 && (estimate == -1 | shortMax < estimate)) {
            estimate = shortMax;
            this.tempResult = shortMax;
          }
        }
      }
    }
    return estimate;
  }

  /** Ensure that for a conservative estimate, the DOUBLE_SUCCESS_PCT is also met
 * at 2 * target for any longer time horizons.
 */

  estimateConservativeFee(target) {
    const constants = policy.feeConstants;
    let estimate = -1;
    if(target <= this.shortStats.maxConfirms) {
      estimate = this.feeStats.estimateMedian(target, constants.SUFFICIENT_FEETXS, constants.DOUBLE_SUCCESS_PCT, true, this.bestHeight);
    }
    if(target <= this.feeStats.maxConfirms) {
      let longEstimate = this.longStats.estimateMedian(target, constants.SUFFICIENT_FEETXS, constants.DOUBLE_SUCCESS_PCT, true, this.bestHeight);
      if(longEstimate > estimate) {
        estimate = longEstimate;
        this.tempResult = longEstimate;
      }
    }
    return estimate;
  }

  estimateSmartFee(target, feeCalc, conservative) {
    const constants = policy.feeConstants;
    let feeCalcObj = {};
    if(feeCalc != null) {
      feeCalcObj.desiredTarget = target;
      feeCalcObj.returnedTarget = target;
    }

    let median = -1;
    let tempResult;

    if(target <= 0 || target > this.longStats.maxConfirms)
      return 0;

    if(target == 1)
      target = 2;

    const maxUsableEstimate = this.maxUsableEstimate();

    if(target > maxUsableEstimate)
      target = maxUsableEstimate;

    if(feeCalc != null)
      feeCalcObj.returnedTarget = target;

    if(target <= 1)
      return 0;

    assert(target > 0);

    /** true is passed to estimateCombined fee for target/2 and target so
     * that we check the max confirms for shorter time horizons as well.
     * This is necessary to preserve monotonically increasing estimates.
     * For non-conservative estimates we do the same thing for 2*target, but
     * for conservative estimates we want to skip these shorter horizons
     * checks for 2*target because we are taking the max over all time
     * horizons so we already have monotonically increasing estimates and
     * the purpose of conservative estimates is not to let short term
     * fluctuations lower our estimates by too much.
     */

    let halfEst = this.estimateCombinedFee(target/2, constants.HALF_SUCCESS_PCT, true);
    tempResult = halfEst;
    median = halfEst;
    if(feeCalc != null) {
      feeCalcObj.est = halfEst;
      feeCalcObj.reason = constants.REASON.HALF_ESTIMATE;
    }

    let actualEst = this.estimateCombinedFee(target, constants.SUCCESS_PCT, true);
    tempResult = actualEst;
    if(actualEst > median) {
      median = actualEst;
      if(feeCalc != null) {
        feeCalcObj.est = actualEst;
        feeCalcObj.reason = constants.REASON.FULL_ESTIMATE;
      }
    }

    let doubleEst = this.estimateCombinedFee(2 * target, constants.DOUBLE_SUCCESS_PCT, !conservative);
    tempResult = doubleEst;
    if(doubleEst > median) {
      median = doubleEst;
      if(feeCalc != null) {
        feeCalcObj.est = doubleEst;
        feeCalcObj.reason = constants.REASON.DOUBLE_ESTIMATE;
      }
    }

    if(conservative || median == -1) {
      let consEst = this.estimateConservativeFee(2 * target);
      if(consEst > median) {
        median = consEst;
        if(feeCalc != null) {
          feeCalcObj.est = consEst;
          feeCalcObj.reason = constants.REASON.CONSERVATIVE;
        }
      }
    }

    if(median < 0)
      return 0;

    return Math.floor(median);
  }

  /**
   * Estimate a priority.
   * @param {Number} [target=1] - Confirmation target.
   * @param {Boolean} [smart=true] - Smart estimation.
   * @returns {Number}
   */

  estimatePriority(target, smart) {
    if (!target)
      target = 1;

    if (smart == null)
      smart = true;

    assert((target >>> 0) === target, 'Target must be a number.');
    assert(target <= this.priStats.maxConfirms,
      'Too many confirmations for estimate.');

    if (!smart) {
      const priority = this.priStats.estimateMedian(
        target, SUFFICIENT_PRITXS, MIN_SUCCESS_PCT,
        true, this.bestHeight);
      return Math.floor(priority);
    }

    let priority = -1;
    while (priority < 0 && target <= this.priStats.maxConfirms) {
      priority = this.priStats.estimateMedian(
        target++, SUFFICIENT_PRITXS, MIN_SUCCESS_PCT,
        true, this.bestHeight);
    }

    target -= 1;

    if (priority < 0)
      return 0;

    return Math.floor(priority);
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
    this.bucketIndex2 = -1;
    this.bucketIndex3 = -1;
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
