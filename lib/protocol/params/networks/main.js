/*!
 * network.js - bitcoin networks for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

/**
 * @module protocol/networks
 */

const BN = require('bcrypto/lib/bn.js');

/*
 * Helpers
 */

function b(hash) {
  return Buffer.from(hash, 'hex');
}

function bRev(hash) {
  return Buffer.from(hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''), 'hex');
}

/**
 * Mainnet
 * @static
 * @lends module:protocol/networks
 * @type {Object}
 */

const main = {};

/**
 * Symbolic network type.
 * @const {String}
 * @default
 */

main.type = 'main';

/**
 * Default DNS seeds.
 * @const {String[]}
 * @default
 */

main.seeds = [
  'lbdn.raptoreum.com:10226',
  '51.89.21.112:10226'
];

/**
 * Packet magic number.
 * @const {Number}
 * @default
 */

main.magic = 0x2e6d7472; //2e6d7472 // 72746d2e

/**
 * Default network port.
 * @const {Number}
 * @default
 */

main.port = 10226;

/**
 * Checkpoint block list.
 * What makes a good checkpoint block?
 * + Is surrounded by blocks with reasonable timestamps
 *   (no blocks before with a timestamp after, none after with timestamp before)
 * + Contains no strange transactions
 * @const {Object}
 */

main.checkpointMap = {
  5145: b('9b1d0f2b10e1e8c7477ae67d702ab1024b49481ab2d49fe426435ff082ccc964'), //64c9cc82f05f4326e49fd4b21a48494b02b12a707de67a47c7e8e1102b0f1d9b
  35000: b('4f410c8cf58ca7fa79304adecb99542e310d70faaaf8ae571514f43e1f19fbb4'), //b4fb191f3ef4141557aef8aafa700d312e5499cbde4a3079faa78cf58c0c414f
  61900: b('5cf2c86c80e9eba13cdaa3efe5a6edfcf186a316ef4f9f55714dfe4462fc46c1'), //c146fc6244fe4d71559f4fef16a386f1fceda6e5efa3da3ca1ebe9806cc8f25c
  394273: b('04dc5775c95116d33c5552bc0f000fdbfc38bcfd0ae639951aa06488a274c20d'), //0dc274a28864a01a9539e60afdbc38fcdb0f000fbc52553cd31651c97557dc04
};

/**
 * Last checkpoint height.
 * @const {Number}
 * @default
 */

main.lastCheckpoint = 394273;

main.txnData = {
  rate: 0.06, // * estimated number of transactions per second after that timestamp
  time: 1662608883, // * UNIX timestamp of last known number of transactions (Block 0)
  count: 2091922 // * total number of transactions between genesis and that timestamp, (the tx=... number in the SetBestChain debug.log lines)
};

/**
 * @const {Number}
 * @default
 */

main.halvingInterval = 210240;

/**
 * Genesis block header.
 * CreateGenesisBlock(uint32_t nTime, uint32_t nNonce, uint32_t nBits, int32_t nVersion, const CAmount& genesisReward)
 * @const {Object}
 */

main.genesis = {
  version: 4, //new BN('00000004', 'hex'),
  hash: b('a0eeca416f685330d93dda38dc86f5d3a9bfff55c68fda7a56b97872f05d9eb7'), //b79e5df07278b9567ada8fc655ffbfa9d3f586dc38da3dd93053686f41caeea0
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('5394264ca7175792acc6512bc1ddbc5b6a087cab0a54ee72ddac6824c28ba487'), //87a48bc22468acdd72ee540aab7c086a5bbcddc12b51c6ac925717a74c269453
  time: 1614369600,
  bits: 536879103,
  nonce: 1130,
  height: 0
};

/**
 * The network's genesis block in a hex string.
 * @const {String}
 */

main.genesisBlock =
  '0400000000000000000000000000000000000000000000000000000000000000000000'
  + '005394264ca7175792acc6512bc1ddbc5b6a087cab0a54ee72ddac6824c28ba4874053'
  + '3960ff1f00206a04000001010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff5804ffff001d01044c4f5468652054696d65'
  + '732032322f4a616e2f3230313820526170746f7265756d206973206e616d65206f6620'
  + '7468652067616d6520666f72206e65772067656e65726174696f6e206f66206669726d'
  + '73ffffffff010088526a740000004341040184710fa689ad5023690c80f3a49c8f13f8'
  + 'd45b8c857fbcbc8bc4a8e4d3eb4b10f4d4604fa08dce601aaf0f470216fe1b51850b4a'
  + 'cf21b179c45070ac7b03a9ac00000000';

/**
 * POW-related constants.
 * @enum {Number}
 * @default
 */

main.pow = {
  /**
   * Default target.
   * @const {BN}
   */

  limit: new BN(
    '00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),

  /**
   * Compact pow limit.
   * @const {Number}
   * @default
   */

  bits: 536936447,

  /**
   * Minimum chainwork for best chain.
   * @const {BN}
   */

  chainwork: new BN(
    '000000000000000000000000000000000000000000000000000eead474ccbc59',
    'hex'
  ),

  /**
   * Desired retarget period in seconds.
   * @const {Number}
   * @default
   */

  targetTimespan: 24 * 60 * 60, // Raptoreum: 1 day

  /**
   * Average block time.
   * @const {Number}
   * @default
   */

  targetSpacing: 2 * 60, // Raptoreum: 2 minutes

  /**
   * Retarget interval in blocks.
   * @const {Number}
   * @default
   */

  retargetInterval: 2016,

  /**
   * Whether to reset target if a block
   * has not been mined recently.
   * @const {Boolean}
   * @default
   */

  targetReset: false,

  /**
   * Do not allow retargetting.
   * @const {Boolean}
   * @default
   */

  noRetargeting: false,

  nPowDGWHeight: 60,

  DGWBlocksAvg: 60,

  fPowAllowMinDifficultyBlocks: false,
};

/**
 * Block constants.
 * Raptoreum src/validation.h
 * @enum {Number}
 * @default
 */

main.block = {
  /**
   * Is bip CSV activated?
   */
  bipCSVEnabled: true,

  /**
   * Is bip147 activated?
   */

  bip147Enabled: true,

  /**
   * Is bip34 activated?
   * Used for avoiding bip30 checks.
   */

  bip34Enabled: true,

  /**
   * Height at which bip34 was activated.
   * Used for avoiding bip30 checks.
   */

  bip34height: 0, //5c7aad59fd281029fba98b04a362d84843e579590e367f9cb0bbb3f9b6ee062b

  /**
   * Hash of the block that activated bip34.
   */

  bip34hash:
    b('a0eeca416f685330d93dda38dc86f5d3a9bfff55c68fda7a56b97872f05d9eb7'),

  bip65Enabled: true,

  /**
   * Height at which bip65 was activated.
   */

  bip65height: 0,

  /**
   * Hash of the block that activated bip65.
   */

  bip65hash:
    b('a0eeca416f685330d93dda38dc86f5d3a9bfff55c68fda7a56b97872f05d9eb7'),

  bip66enabled: true,

  /**
   * Height at which bip66 was activated.
   */

  bip66height: 0,

  /**
   * Hash of the block that activated bip66.
   */

  bip66hash:
    b('a0eeca416f685330d93dda38dc86f5d3a9bfff55c68fda7a56b97872f05d9eb7'),

  dip0001Enabled: true,
  dip0003Enabled: true,
  dip0008Enabled: true,

  /**
   * Safe height to start pruning.
   */

  pruneAfterHeight: 100000,

  /**
   * Safe number of blocks to keep.
   * raptoreum validation.h line 214
   */

  keepBlocks: 288,

  /**
   * Age used for the time delta to
   * determine whether the chain is synced.
   * Raptoreum - ~144 blocks behind -> 2 x fork detection time, was 24 * 60 * 60 in bitcoin
   */

  maxTipAge: 6 * 60 * 60,

  /**
   * Height at which block processing is
   * slow enough that we can output
   * logs without spamming.
   */

  slowHeight: 825000,

  /**
   * Maximum age of our tip in seconds for us to be considered current for fee estimation
   */

  maxFeeEstimationTipAge: 3 * 60 * 60,

  futureForkBlock: 420420,
  smartnodePaymentFixedBlock: 6800,
  defaultAssumeValid: bRev('6fb0b649723f51b67484019409fef94d077f17c8d88645e08c000b2e4fd3e28a'),
};

main.bip30 = {};

/**
 * For versionbits.
 * @const {Number}
 * @default
 */

main.activationThreshold = 1916; // 95% of 2016

/**
 * Confirmation window for versionbits.
 * @const {Number}
 * @default
 */

main.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

/**
 * Deployments for versionbits.
 * @const {Object}
 * @default
 */

main.deployments = {
  csv: {
    name: 'v17',
    bit: 0,
    startTime: 1665644400, // 1665644400; // 0ct 13, 2022 00:00:00hrs
    timeout: 9999999999, // 1675206001; // Feb 01, 2023 00:00:01hrs
    threshold: 3226,
    window: 4032,
    required: false,
    force: true
  },
  testdummy: {
    name: 'testdummy',
    bit: 28,
    startTime: 1199145601, // January 1, 2008
    timeout: 1230767999, // December 31, 2008
    threshold: -1,
    window: -1,
    required: false,
    force: true
  }
};

/**
 * Deployments for versionbits (array form, sorted).
 * @const {Array}
 * @default
 */

main.deploys = [
  main.deployments.csv, //aka v17
  main.deployments.testdummy
];

/**
 * Key prefixes.
 * @enum {Number}
 * @default
 */

main.keyPrefix = {
  privkey: 0x80,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  xpubkey58: 'xpub',
  xprivkey58: 'xprv',
  coinType: 10226
};

/**
 * {@link Address} prefixes.
 * @enum {Number}
 */

main.addressPrefix = {
  pubkeyhash: 0x3c,
  scripthash: 0x7a,
  bech32: null
};

/**
 * Default value for whether the mempool
 * accepts non-standard transactions.
 * @const {Boolean}
 * @default
 */

main.requireStandard = true;

/**
 * Default http port.
 * @const {Number}
 * @default
 */

main.rpcPort = 9998;

/**
 * Default wallet port.
 * @const {Number}
 * @default
 */

main.walletPort = 9997;

/**
 * Default min relay rate.
 * @const {Rate}
 * @default
 */

main.minRelay = 1000;

/**
 * Default normal relay rate.
 * @const {Rate}
 * @default
 */

main.feeRate = 5000;

/**
 * Maximum normal relay rate.
 * @const {Rate}
 * @default
 */

main.maxFeeRate = 400000;

/**
 * Whether to allow self-connection.
 * @const {Boolean}
 */

main.selfConnect = false;

/**
 * Whether to request mempool on sync.
 * @const {Boolean}
 */

main.requestMempool = false;

exports.main = main;
