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

exports.testnet = testnet;
