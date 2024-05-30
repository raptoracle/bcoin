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
const utils = require('../utils/util');
const consensus = require('./consensus');

const network = exports;

/*
 * Helpers
 */

function b(hash) {
  return Buffer.from(hash, 'hex');
  //return Buffer.from(hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''), 'hex');
}

function bRev(hash) {
  //return Buffer.from(hash, 'hex');
  return Buffer.from(hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''), 'hex');
}

/**
 * Network type list.
 * @memberof module:protocol/networks
 * @const {String[]}
 * @default
 */

network.types = ['main', 'testnet', 'regtest'];

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
  //100000: bRev('13217ed8d3c18b14c1e6880538a00da1baca3aacfa244bdde8ef8a64fbe990d0'),
  //125000: bRev('df11446730e0c9e56139b9ffe7ff5333d558aa38bcaac224b9966dadac217bdf'),
  //150000: bRev('c5bc457facd000e88e1728d08f3ec6e5d4a74901ec96f995cf059920a5abf2d0'),
  //175000: bRev('5fefb6501d108364f617125d758cd8de6f9984c17e2d7a745cfbe31f0c8e5434'),
  //200000: bRev('7b217a8e85368ab0514b0acd125ece1b30365a65d19940241418111d25f6ad52'),
  //225000: bRev('1d576252dae2f0976b97bb6b43b576d85932cacd77b319e5f85a57daf2c5791c'),
  //250000: bRev('2b21134b0d9aee2d6dccfa4198e5aae055784bfaaec1177d27c340ce8ecb9ea0'),
  //275000: bRev('65a0c2120e7fa903516f4851b95b1c94ed9cdf8dde5db18684b65f774f12e37e'),
  //300000: bRev('b5fcec6690a601d413c251485ca329a10204ae853ee682fd730763dda9d40395'),
  //325000: bRev('292a32117baa46e05049ed599b63479780a095ca12d208e4d65d8dc934a91b73'),
  //350000: bRev('c25758f8a6168a32cd3e94f2f439636a1087371577f17ce3143f92bac90c5506'),
  //375000: bRev('00ba0ce76496599f677b3bb1f62a8c5d398df680830fde3f21fc4e8bd5d63f0d'),
  394273: b('04dc5775c95116d33c5552bc0f000fdbfc38bcfd0ae639951aa06488a274c20d'), //0dc274a28864a01a9539e60afdbc38fcdb0f000fbc52553cd31651c97557dc04
  //425000: bRev('d7e655aee3bb63143934e9c129b6c40dee098b4e2090f7a17b66808258527a3a'),
  //450000: bRev('fc5ca1e30333423888ee72fc5c7149117ce15b5f25c6b02ed19557d668d9a43f'),
  //475000: bRev('1683721fc05f1525fd72b410a3cc7f1774451eb7072114ec764778c5cdd57e86'),
  //500000: bRev('f72c5c7c3ff48d8e41d9a4323b5064be0c7350be23b16d4f9cf6fa596df2635f'),
  //525000: bRev('9c0e1a206f4532164ebe67a953e9c0f6ce25edc217508ff035697f947793934a'),
  //550000: bRev('db4039575a31865e78b7e026a82c009ac61202411c817a3932cf1040ccdcc63f'),
  //575000: bRev('f98303222b81d63235561700008f10829828ab3d9c0b5871e4717ccbcf7c3dfa'),
  //600000: bRev('5e900c26e6f54ece9637e5e0eecc7b56f30ce9139990d29c14e0002842ca107c'),
  //625000: bRev('c2a6286b6e7337da4e634dbf2bd7dedd7144392abac2e924907f0703fb838598'),
  //650000: bRev('e2c8c038a32a0bfee819d6ecd43eae2bd54295790236009a50cd46f7016fcb6a'),
  //675000: bRev('e73e82f6f5cc4007cc95d268359e00f743944426429b2d912b9fad3ebdd8d952'),
  //700000: bRev('b6653f22467ba33a29ffb9609ba90b65c3e6bd3f36ad0cecdee1e302cf1e57a8'),
  //725000: bRev('00e4030facc2872fb2a726b179656537a3c94a4f994fef97cccac9586a7d4105'),
  //750000: bRev('90c332a7749a6fff09fd73d7e9169b289884e4940305ec85fd91a2cfae86aea2'),
  //775000: bRev('47d1ace27db568a481f17d674481158e21cdc893d40beec6b3d0b8d07cd8f42e'),
  //800000: bRev('467cf8c8c05a2c560ce5e4ffe6e2a473ad1f235d7ceda3064b6e573bfcd2f053'),
  //825000: bRev('b2d3c8ee5dbd693b367fa53ff90976daf24f8f6eec6b4a70c69381ff514f2482'),
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

  bits: 536936447, //536879103 //536870912 // new BN('20001fff', 'hex'),536936447

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

/*
 * Testnet (v3)
 * https://en.bitcoin.it/wiki/Testnet
 */

const testnet = {};

testnet.type = 'testnet';

testnet.seeds = [
  'lbdn.raptoreum.com:10230',
  '47.155.87.132:10230'
];

testnet.magic = 0x6d747274; //6d747274

testnet.port = 10230;

testnet.checkpointMap = {
  0: b('16b418c4e84599ba61836085c5b780c199f90c207f7de189cbb56803e87529eb'),
};

testnet.lastCheckpoint = 394273;

testnet.txnData = {
  rate: 0.01, // * estimated number of transactions per second after that timestamp
  time: 1645942755, // * UNIX timestamp of last known number of transactions (Block 0)
  count: 0 // * total number of transactions between genesis and that timestamp, (the tx=... number in the SetBestChain debug.log lines)
};

testnet.halvingInterval = 210240;

testnet.genesis = {
  version: 4,
  hash: b('16b418c4e84599ba61836085c5b780c199f90c207f7de189cbb56803e87529eb'),
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('87a48bc22468acdd72ee540aab7c086a5bbcddc12b51c6ac925717a74c269453'),
  time: 1668574674,
  bits: 536879103,
  nonce: 352,
  height: 0
};

testnet.genesisBlock =
  '0100000000000000000000000000000000000000000000000000000000000000000000'
  + '003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5'
  + '494dffff001d1aa4ae1801010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff4d04ffff001d0104455468652054696d6573'
  + '2030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66'
  + '207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01'
  + '000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f'
  + '61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f'
  + 'ac00000000';

testnet.pow = {
  limit: new BN(
    '00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 536879103,
  chainwork: new BN(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex'
  ),
  targetTimespan: 24 * 60 * 60, // Raptoreum: 1 day
  targetSpacing: 60, // Raptoreum: 1 min
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: false,
  fPowAllowMinDifficultyBlocks: true,
};

testnet.block = {
  bip34height: 0,
  bip34hash:
    b('16b418c4e84599ba61836085c5b780c199f90c207f7de189cbb56803e87529eb'),
  bip65height: 0,
  bip65hash:
    b('16b418c4e84599ba61836085c5b780c199f90c207f7de189cbb56803e87529eb'),
  bip66height: 0,
  bip66hash:
    b('16b418c4e84599ba61836085c5b780c199f90c207f7de189cbb56803e87529eb'),
  pruneAfterHeight: 100000,
  keepBlocks: 288,
  maxTipAge: 24 * 60 * 60,
  slowHeight: 325000
};

testnet.bip30 = {};

testnet.activationThreshold = 1512; // 75% for testchains

testnet.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

testnet.deployments = {
  testdummy: {
    name: 'testdummy',
    bit: 28,
    startTime: 1199145601, // January 1, 2008
    timeout: 1230767999, // December 31, 2008
    threshold: -1,
    window: -1,
    required: false,
    force: true
  },
  v17: {
    name: 'v17',
    bit: 0,
    startTime: 1643670001, // 1665644400; // 0ct 13, 2022 00:00:00hrs
    timeout: 1675206001, // 1675206001; // Feb 01, 2023 00:00:01hrs
    threshold: 80,
    window: 100,
    required: true,
    force: false
  }
};

testnet.deploys = [
  testnet.deployments.v17,
  testnet.deployments.testdummy
];

testnet.keyPrefix = {
  privkey: 0x80,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 10227
};

testnet.addressPrefix = {
  pubkeyhash: 0x7b,
  scripthash: 0x13,
  bech32: null
};

testnet.requireStandard = false;

testnet.rpcPort = 9996;

testnet.walletPort = 9995;

testnet.minRelay = 1000;

testnet.feeRate = 5000;

testnet.maxFeeRate = 400000;

testnet.selfConnect = false;

testnet.requestMempool = false;

testnet.futureForkBlock = 1000;

/*
 * Regtest
 */

const regtest = {};

regtest.type = 'regtest';

regtest.seeds = [];

regtest.magic = 0xdab5bffa;

regtest.port = 48444;

regtest.checkpointMap = {};
regtest.lastCheckpoint = 0;

regtest.txnData = {
  rate: 0,
  time: 0,
  count: 0
};

regtest.halvingInterval = 150;

regtest.genesis = {
  version: 1,
  hash: b('06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f'),
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a'),
  time: 1296688602,
  bits: 545259519,
  nonce: 2,
  height: 0
};

regtest.genesisBlock =
  '0100000000000000000000000000000000000000000000000000000000000000000000'
  + '003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5'
  + '494dffff7f200200000001010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff4d04ffff001d0104455468652054696d6573'
  + '2030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66'
  + '207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01'
  + '000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f'
  + '61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f'
  + 'ac00000000';

regtest.pow = {
  limit: new BN(
    '7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 545259519,
  chainwork: new BN(
    '0000000000000000000000000000000000000000000000000000000000000002',
    'hex'
  ),
  targetTimespan: 14 * 24 * 60 * 60,
  targetSpacing: 10 * 60,
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: true
};

regtest.block = {
  bip34height: 100000000,
  bip34hash: null,
  bip65height: 1351,
  bip65hash: null,
  bip66height: 1251,
  bip66hash: null,
  pruneAfterHeight: 1000,
  keepBlocks: 10000,
  maxTipAge: 0xffffffff,
  slowHeight: 0
};

regtest.bip30 = {};

regtest.activationThreshold = 108; // 75% for testchains

regtest.minerWindow = 144; // Faster than normal for regtest

regtest.deployments = {
  csv: {
    name: 'csv',
    bit: 0,
    startTime: 0,
    timeout: 0xffffffff,
    threshold: -1,
    window: -1,
    required: false,
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: -1,
    timeout: 0xffffffff,
    threshold: -1,
    window: -1,
    required: true,
    force: false
  },
  segsignal: {
    name: 'segsignal',
    bit: 4,
    startTime: 0xffffffff,
    timeout: 0xffffffff,
    threshold: 269,
    window: 336,
    required: false,
    force: false
  },
  testdummy: {
    name: 'testdummy',
    bit: 28,
    startTime: 0,
    timeout: 0xffffffff,
    threshold: -1,
    window: -1,
    required: false,
    force: true
  }
};

regtest.deploys = [
  regtest.deployments.csv,
  regtest.deployments.segwit,
  regtest.deployments.segsignal,
  regtest.deployments.testdummy
];

regtest.keyPrefix = {
  privkey: 0xef,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

regtest.addressPrefix = {
  pubkeyhash: 0x6f,
  scripthash: 0xc4,
  bech32: null
};

regtest.requireStandard = false;

regtest.rpcPort = 48332;

regtest.walletPort = 48334;

regtest.minRelay = 1000;

regtest.feeRate = 20000;

regtest.maxFeeRate = 60000;

regtest.selfConnect = true;

regtest.requestMempool = true;

regtest.futureForkBlock = 1;

/*
 * Simnet (btcd)
 */

const simnet = {};

simnet.type = 'simnet';

simnet.seeds = [
  '127.0.0.1'
];

simnet.magic = 0x12141c16;

simnet.port = 18555;

simnet.checkpointMap = {};

simnet.lastCheckpoint = 0;

simnet.txnData = {
  time: 0,
  count: 0,
  rate: 0
};

simnet.halvingInterval = 210000;

simnet.genesis = {
  version: 1,
  hash:
    b('f67ad7695d9b662a72ff3d8edbbb2de0bfa67b13974bb9910d116d5cbd863e68'),
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a'),
  time: 1401292357,
  bits: 545259519,
  nonce: 2,
  height: 0
};

simnet.genesisBlock =
  '0100000000000000000000000000000000000000000000000000000000000000000000'
  + '003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a4506'
  + '8653ffff7f200200000001010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff4d04ffff001d0104455468652054696d6573'
  + '2030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66'
  + '207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01'
  + '000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f'
  + '61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f'
  + 'ac00000000';

simnet.pow = {
  limit: new BN(
    // High target of 0x207fffff (545259519)
    '7fffff0000000000000000000000000000000000000000000000000000000000',
    'hex'
  ),
  bits: 545259519,
  chainwork: new BN(
    '0000000000000000000000000000000000000000000000000000000000000002',
    'hex'
  ),
  targetTimespan: 14 * 24 * 60 * 60,
  targetSpacing: 10 * 60,
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: false
};

simnet.block = {
  bip34height: 0,
  bip34hash:
    b('f67ad7695d9b662a72ff3d8edbbb2de0bfa67b13974bb9910d116d5cbd863e68'),
  bip65height: 0,
  bip65hash:
    b('f67ad7695d9b662a72ff3d8edbbb2de0bfa67b13974bb9910d116d5cbd863e68'),
  bip66height: 0,
  bip66hash:
    b('f67ad7695d9b662a72ff3d8edbbb2de0bfa67b13974bb9910d116d5cbd863e68'),
  pruneAfterHeight: 1000,
  keepBlocks: 10000,
  maxTipAge: 0xffffffff,
  slowHeight: 0
};

simnet.bip30 = {};

simnet.activationThreshold = 75; // 75% for testchains

simnet.minerWindow = 100; // nPowTargetTimespan / nPowTargetSpacing

simnet.deployments = {
  csv: {
    name: 'csv',
    bit: 0,
    startTime: 0, // March 1st, 2016
    timeout: 0xffffffff, // May 1st, 2017
    threshold: -1,
    window: -1,
    required: false,
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: 0, // May 1st 2016
    timeout: 0xffffffff, // May 1st 2017
    threshold: -1,
    window: -1,
    required: true,
    force: false
  },
  segsignal: {
    name: 'segsignal',
    bit: 4,
    startTime: 0xffffffff,
    timeout: 0xffffffff,
    threshold: 269,
    window: 336,
    required: false,
    force: false
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

simnet.deploys = [
  simnet.deployments.csv,
  simnet.deployments.segwit,
  simnet.deployments.segsignal,
  simnet.deployments.testdummy
];

simnet.keyPrefix = {
  privkey: 0x64,
  xpubkey: 0x0420bd3a,
  xprivkey: 0x0420b900,
  xpubkey58: 'spub',
  xprivkey58: 'sprv',
  coinType: 115
};

simnet.addressPrefix = {
  pubkeyhash: 0x3f,
  scripthash: 0x7b,
  bech32: 'sb'
};

simnet.requireStandard = false;

simnet.rpcPort = 18556;

simnet.walletPort = 18558;

simnet.minRelay = 1000;

simnet.feeRate = 20000;

simnet.maxFeeRate = 60000;

simnet.selfConnect = false;

simnet.requestMempool = false;

/*
 * Expose
 */

network.main = main;
network.testnet = testnet;
network.regtest = regtest;
network.simnet = simnet;
