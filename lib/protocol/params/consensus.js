/*!
 * consensus.js - consensus constants and helpers for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const {fDIP0001Active} = require('./common');
const llmq = require('./llmq');

/**
 * @module protocol/consensus
 */

const assert = require('bsert');
const BN = require('bcrypto/lib/bn.js');

exports.INT_MAX = 2147483647;

/**
 * One bitcoin in satoshis.
 * @const {Amount}
 * @default
 */

exports.COIN = 100000000;
exports.CENT = 1000000;

/**
 * Maximum amount of money in satoshis:
 * `21million * 1btc` (consensus).
 * @const {Amount}
 * @default
 */

exports.MAX_MONEY = 21000000000 * exports.COIN;
exports.OLD_MAX_MONEY = 21000000 * exports.COIN;

/**
 * Base block subsidy (consensus).
 * Note to shitcoin implementors: if you
 * increase this to anything greater than
 * 33 bits, getReward will have to be
 * modified to handle the shifts.
 * @const {Amount}
 * @default
 */

exports.BASE_REWARD = 50 * 100;

/**
 * Half base block subsidy. Required to
 * calculate the reward properly (with
 * only 32 bit shifts available).
 * @const {Amount}
 * @default
 */

exports.HALF_REWARD = Math.floor(exports.BASE_REWARD / 2);

exports.DEFAULT_FOUNDER_ADDRESS = "RTtyQU6DoSuNWetT4WUem5qXP5jNYGpwat";

exports.rewardStructures = [{ height: exports.INT_MAX, percentage: 5}];

exports.collaterals = [
  {height: 88720, amount: 600000 * exports.COIN},
  {height: 132720, amount: 800000 * exports.COIN},
  {height: 176720, amount: 1000000 * exports.COIN},
  {height: 220720, amount: 1250000 * exports.COIN},
  {height: 264720, amount: 1500000 * exports.COIN},
  {height: exports.INT_MAX, amount: 1800000 * exports.COIN}
 ];

exports.rewardPercentages = [
  {height: 5761, percentage: 0},
  {height: 2147483647, percentage: 20}
];

exports.futureRewardShare = {
  smartnode: 0.8,
  miner: 0.2,
  founder: 0.0
};

/**
 * Maximum block base size (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_LEGACY_BLOCK_SIZE = 1000000;
exports.MAX_DIP0001_BLOCK_SIZE = 2000000;

exports.getMaxBlockSize = function getMaxBlockSize() {
  return fDIP0001Active ? exports.MAX_DIP0001_BLOCK_SIZE : exports.MAX_LEGACY_BLOCK_SIZE;
};

exports.getMaxBlockSigOps = function getMaxBlockSigOps() {
  return exports.getMaxBlockSize(fDIP0001Active) / 50;
};

exports.MAX_BLOCK_SIZE = exports.getMaxBlockSize();

/**
 * Maximum block serialization size (protocol).
 * @const {Number}
 * @default
 */

exports.MAX_RAW_BLOCK_SIZE = 32000000;

/**
 * Maximum block weight (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_WEIGHT = 4000000;

/**
 * Maximum block sigops (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_SIGOPS = exports.getMaxBlockSigOps();

/**
 * Maximum block sigops per mb (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_SIGOPS_PER_MB = 20000;

/**
 * Maximum transaction sigops
 * @const {Number}
 * @default
 */

exports.MAX_TX_SIGOPS = 4000;

/**
 * Maximum block sigops cost (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_SIGOPS_COST = 80000;

/**
 * Maximum size for coinbase script sig
 * @const {Number}
 * @default
 */
exports.MAX_COINBASE_SCRIPTSIG_SIZE = 100;

/**
 * Size of set to pick median time from.
 * @const {Number}
 * @default
 */

exports.MEDIAN_TIMESPAN = 11;

/**
 * What bits to set in version
 * for versionbits blocks.
 * @const {Number}
 * @default
 */

exports.VERSION_TOP_BITS = 0x20000000;

/**
 * What bitmask determines whether
 * versionbits is in use.
 * @const {Number}
 * @default
 */

exports.VERSION_TOP_MASK = 0xe0000000;

/**
 * Number of blocks before a coinbase
 * spend can occur (consensus).
 * @const {Number}
 * @default
 */

exports.COINBASE_MATURITY = 100;

/**
 * nLockTime threshold for differentiating
 * between height and time (consensus).
 * Tue Nov 5 00:53:20 1985 UTC
 * @const {Number}
 * @default
 */

exports.LOCKTIME_THRESHOLD = 500000000;
exports.LOCKTIME_VERIFY_SEQUENCE = (1 << 0);
exports.LOCKTIME_MEDIAN_TIME_PAST = (1 << 1);

exports.SEQUENCE_FINAL = 0xffffffff;

/**
 * Highest nSequence bit -- disables
 * sequence locktimes (consensus).
 * @const {Number}
 */

exports.SEQUENCE_DISABLE_FLAG = (1 << 31) >>> 0;

/**
 * Sequence time: height or time (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_TYPE_FLAG = 1 << 22;

/**
 * Sequence granularity for time (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_GRANULARITY = 9;

/**
 * Sequence mask (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_MASK = 0x0000ffff;

/**
 * Max serialized script size (consensus).
 * src/script/script.h:32
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_SIZE = 10000;

/**
 * Max stack size during execution (consensus).
 * src/script/script.h:35
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_STACK = 1000;

/**
 * Max script element size (consensus).
 * src/script/script.h:23
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_PUSH = 520;

/**
 * Max opcodes executed (consensus).
 * src/script/script.h:26
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_OPS = 201;

/**
 * Max `n` value for multisig (consensus).
 * src/script/script.h:29
 * @const {Number}
 * @default
 */

exports.MAX_MULTISIG_PUBKEYS = 20;

/**
 * The date bip16 (p2sh) was activated (consensus).
 * @const {Number}
 * @default
 */

exports.BIP16_TIME = 1333238400;

/**
 * A hash of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_HASH = Buffer.alloc(32, 0x00);

/**
 * The maximum allowed size of version 3 extra payload.
 * @const {Number}
 * @default
 */

exports.MAX_TX_EXTRA_PAYLOAD = 10000;

exports.DIP0008Enabled = true;

/**
 * Convert a compact number to a big number.
 * Used for `block.bits` -> `target` conversion.
 * @param {Number} compact
 * @returns {BN}
 */

exports.fromCompact = function fromCompact(compact) {
  if (compact === 0)
    return new BN(0);

  const exponent = compact >>> 24;
  const negative = (compact >>> 23) & 1;

  let mantissa = compact & 0x7fffff;
  let num;

  if (exponent <= 3) {
    mantissa >>>= 8 * (3 - exponent);
    num = new BN(mantissa);
  } else {
    num = new BN(mantissa);
    num.iushln(8 * (exponent - 3));
  }

  if (negative)
    num.ineg();

  return num;
};

/**
 * Convert a big number to a compact number.
 * Used for `target` -> `block.bits` conversion.
 * @param {BN} num
 * @returns {Number}
 */

exports.toCompact = function toCompact(num) {
  if (num.isZero())
    return 0;

  let exponent = num.byteLength();
  let mantissa;

  if (exponent <= 3) {
    mantissa = num.toNumber();
    mantissa <<= 8 * (3 - exponent);
  } else {
    mantissa = num.ushrn(8 * (exponent - 3)).toNumber();
  }

  if (mantissa & 0x800000) {
    mantissa >>= 8;
    exponent++;
  }

  let compact = (exponent << 24) | mantissa;

  if (num.isNeg())
    compact |= 0x800000;

  compact >>>= 0;

  return compact;
};

exports.powLimit = new BN(
  '00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'hex'
);

exports.genesisBits = 536879103;
exports.genesisNonce = 1130;
exports.nSuperblockStartBlock = exports.INT_MAX; // The block at which 12.1 goes live (end of final 12.0 budget cycle)
exports.nSuperblockStartHash = '';
exports.nSuperblockCycle = 16616; // ~(60*24*30)/2.6, actual number of blocks per month is 200700 / 12 = 16725

/**
 * Verify proof-of-work.
 * @param {Hash} hash
 * @param {Number} bits
 * @returns {Boolean}
 */

exports.verifyPOW = function verifyPOW(hash, bits) {
  const target = exports.fromCompact(bits);

  if (target.isNeg() || target.isZero())
    return false;

  if (target.bitLength() > 256)
    return false;

  const num = new BN(hash, 'le');

  //if (num.gt(target)) 
  //  return false;
  if(target.gt(exports.powLimit))
    return false;

  return true;
};

exports.verifyGenesisPOW = function verifyGenesisPOW(hash, nonce) {
  const target = exports.fromCompact(genesisBits);
  const num = new BN(hash, 'le');

  //console.log(num, target);

  if (num.lte(target)) {
    //console.log(num, target);
    //console.log(genesisNonce == nonce);
  }

  return true;
/*
  do {
    if (num.lte(target)) {
      if (genesis.nonce != nonce) {
        assert(genesis.nonce == nonce);
      } else {
        return;
      }
    }
    ++nonce;
  } while(nonce != 0);
*/
  // We should never get here
  //assert(false, "VerifyGenesisPOW: could not find valid Nonce for genesis block");
  //return false;
};

/**
 * Calculate block subsidy.
 * @param {Number} height - Reward era by height.
 * @returns {Amount}
 */

exports.getReward = function getReward(height, interval) {
  assert(height >= 0, 'Bad height for reward.');

  const halvings = Math.floor(height / interval);

  // BIP 42 (well, our own version of it,
  // since we can only handle 32 bit shifts).
  // https://github.com/bitcoin/bips/blob/master/bip-0042.mediawiki
  if (halvings >= 33)
    return 0;

  // We need to shift right by `halvings`,
  // but 50 btc is a 33 bit number, so we
  // cheat. We only start halving once the
  // halvings are at least 1.
  if (halvings === 0)
    return exports.BASE_REWARD;

  return exports.HALF_REWARD >>> (halvings - 1);
};

exports.getBlockSubsidy = function getBlockSubsidy(prevHeight) {
  let coin = new BN(exports.COIN);
  let subsidy = exports.BASE_REWARD;
  const owlings = 21262;
  let multiplier;
  let tempHeight;

  if (prevHeight < 720) {
    subsidy = 4;
  } else if ((prevHeight > 553531) && (prevHeight < 2105657)) {
      tempHeight = prevHeight - 553532;
      multiplier = tempHeight / owlings;
      subsidy -= (multiplier * 10 + 10);
  } else if ((prevHeight >= 2105657) && (prevHeight < 5273695)) {
      tempHeight = prevHeight - 2105657;
      multiplier = tempHeight / owlings;
      subsidy -= (multiplier * 20 + 750);
  } else if ((prevHeight >= 5273695) && (prevHeight < 7378633)) {
      tempHeight = prevHeight - 5273695;
      multiplier = tempHeight / owlings;
      subsidy -= (multiplier * 10 + 3720);
  } else if ((prevHeight >= 7378633) && (prevHeight < 8399209)) {
      tempHeight = prevHeight - 7378633;
      multiplier = tempHeight / owlings;
      subsidy -= (multiplier * 5 + 4705);
  } else if ((prevHeight >= 8399209) && (prevHeight < 14735285)) {
    subsidy = 55;
  } else if ((prevHeight >= 14735285) && (prevHeight < 15798385)) {
      tempHeight = prevHeight - 14735285;
      multiplier = tempHeight / owlings;
      subsidy -= (multiplier + 4946);
  } else if ((prevHeight >= 15798385) && (prevHeight < 25844304)) {
    subsidy = 5;
  } else if (prevHeight >= 25844304) {
    subsidy = 0.001;
  }

  const subsidyVal = new BN(Math.floor(subsidy));
  const subsidySats = subsidyVal.mul(coin);

  return subsidySats.toString(10);
};

exports.moneyRange = function moneyRange(value, nV17active = true) {
  value = new BN(value);
  
  let mm = new BN(BigInt(exports.MAX_MONEY));
  let omm = new BN(BigInt(exports.OLD_MAX_MONEY));

  if(nV17active) {
    return (value.isZero() || !value.isNeg()) && value.lte(mm);
  } else {
    return (value.isZero() || !value.isNeg()) && value.lte(omm);
  }
};

exports.getCollateral = function getCollateral(height) {
  for (let i = 0; i < exports.collaterals.length; i++) {
    let it = exports.collaterals[i];
		if(it.height === exports.INT_MAX || height <= it.height) {
			return it.amount;
		}
  }
  return 0;
};

exports.getRewardPercentage = function getRewardPercentage(height) {
  for (let i = 0; i < exports.rewardPercentages.length; i++) {
    let it = exports.rewardPercentages[i];
		if(it.height === exports.INT_MAX || height <= it.height) {
			return it.percentage;
		}
  }
  return 0;
};

exports.getSmartnodePayment = function getSmartnodePayment(network, height, blockValue, specialTxFees) {
  const mnCount = 0;

  if(mnCount >= 10 || network.type === "main") {
    let percentage = exports.getRewardPercentage(height);
    let specialFeeReward = specialTxFees * exports.futureRewardShare.smartnode;
    return blockValue * percentage / 100 + specialFeeReward;
  } else {
    return 0;
  }
};

exports.isFuturesEnabled = function isFuturesEnabled(network, height) {
  return height >= network.futureForkBlock;
};

/**
 * Test version bit.
 * @param {Number} version
 * @param {Number} bit
 * @returns {Boolean}
 */

exports.hasBit = function hasBit(version, bit) {
  const TOP_MASK = exports.VERSION_TOP_MASK;
  const TOP_BITS = exports.VERSION_TOP_BITS;
  const bits = (version & TOP_MASK) >>> 0;
  const mask = 1 << bit;
  return bits === TOP_BITS && (version & mask) !== 0;
};

/**
 * Calculate max block sigops.
 * @param {Number} size
 * @returns {Number}
 */

exports.maxBlockSigops = function maxBlockSigops(size) {
  const mb = 1 + ((size - 1) / 1e6 | 0);
  return mb * exports.MAX_BLOCK_SIGOPS_PER_MB;
};

exports.llmqs = [];

exports.llmqs[llmq.LLMQ_TYPES.LLMQ_TYPE_50_60] = llmq.llmq3_60;
exports.llmqs[llmq.LLMQ_TYPES.LLMQ_TYPE_400_60] = llmq.llmq20_60;
exports.llmqs[llmq.LLMQ_TYPES.LLMQ_TYPE_400_85] = llmq.llmq20_85;
exports.llmqs[llmq.LLMQ_TYPES.LLMQ_TYPE_100_67] = llmq.llmq100_67_mainnet;

exports.llmqTypeChainLocks = llmq.LLMQ_TYPES.LLMQ_TYPE_400_60;
exports.llmqTypeInstantSend = llmq.LLMQ_TYPES.LLMQ_TYPE_50_60;
exports.llmqTypePlatform = llmq.LLMQ_TYPES.LLMQ_TYPE_100_67;
