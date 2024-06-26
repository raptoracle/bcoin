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
const consensus = require('../consensus');

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
 * Testnet (v4)
 * https://en.bitcoin.it/wiki/Testnet
 */

const testnet = {};

testnet.type = 'testnet';

testnet.seeds = [
  'lbtn.raptoreum.com:10230',
  '47.151.9.131:10230'
];

testnet.magic = 0x6d747274; //6d747274

testnet.port = 10230;

testnet.checkpointMap = {};

testnet.lastCheckpoint = 0;

testnet.txnData = {
  rate: 0.02108492915974094, // * estimated number of transactions per second after that timestamp
  time: 1712153599, // * UNIX timestamp of last known number of transactions (Block 0)
  count: 22643 // * total number of transactions between genesis and that timestamp, (the tx=... number in the SetBestChain debug.log lines)
};

testnet.halvingInterval = 210240;

testnet.genesis = {
  version: 4,
  hash: b('bbab22066081d3b466abd734de914e8092abf4e959bcd0fff978297c41591b23'),
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('87a48bc22468acdd72ee540aab7c086a5bbcddc12b51c6ac925717a74c269453'),
  time: 1711078237,
  bits: 536879103,
  nonce: 971,
  height: 0
};

testnet.genesisBlock =
    '0400000000000000000000000000000000000000000000000000000000000000000000'
  + '005394264ca7175792acc6512bc1ddbc5b6a087cab0a54ee72ddac6824c28ba4875dfb'
  + 'fc65ff1f0020cb03000001010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff5804ffff001d01044c4f5468652054696d65'
  + '732032322f4a616e2f3230313820526170746f7265756d206973206e616d65206f6620'
  + '7468652067616d6520666f72206e65772067656e65726174696f6e206f66206669726d'
  + '73ffffffff010088526a740000004341040184710fa689ad5023690c80f3a49c8f13f8'
  + 'd45b8c857fbcbc8bc4a8e4d3eb4b10f4d4604fa08dce601aaf0f470216fe1b51850b4a'
  + 'cf21b179c45070ac7b03a9ac00000000';

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
  bipCSVEnabled: true,
  bip147Enabled: true,
  bip34Enabled: true,
  bip34height: 0, //5c7aad59fd281029fba98b04a362d84843e579590e367f9cb0bbb3f9b6ee062b
  bip34hash:
    b('bbab22066081d3b466abd734de914e8092abf4e959bcd0fff978297c41591b23'),
  bip65Enabled: true,
  bip65height: 0,
  bip65hash:
    b('bbab22066081d3b466abd734de914e8092abf4e959bcd0fff978297c41591b23'),
  bip66enabled: true,
  bip66height: 0,
  bip66hash:
    b('bbab22066081d3b466abd734de914e8092abf4e959bcd0fff978297c41591b23'),
  dip0001Enabled: true,
  dip0003Enabled: true,
  dip0008Enabled: true,
  pruneAfterHeight: 1000,
  keepBlocks: 288,
  maxTipAge: 6 * 60 * 60,
  slowHeight: 1,
  maxFeeEstimationTipAge: 3 * 60 * 60,
  futureForkBlock: 1000,
  smartnodePaymentFixedBlock: 1,
  defaultAssumeValid: b('0000000000000000000000000000000000000000000000000000000000000000'),
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

testnet.vSporkAddresses = ['rsqc2caFRG6myRdzKipP4PpVW9LnFaG7CH'];
testnet.nMinSporkKeys = 1;
testnet.fBIP9CheckSmartnodesUpgraded = true;

testnet.defaultFounderAddress = "rghjACzPtVAN2wydgDbn9Jq1agREu6rH1e";

testnet.rewardStructures = [{ height: consensus.INT_MAX, percentage: 5}];

// smartnodes 
testnet.nSmartnodePaymentsStartBlock = 1000; // not true, but it's ok as long as it's less then nSmartnodePaymentsIncreaseBlock
testnet.nSmartnodePaymentsIncreaseBlock = 4030;
testnet.nSmartnodePaymentsIncreasePeriod = 10;

//smart nodes collaterals
testnet.collaterals = [
  {height: consensus.INT_MAX, amount: 60000 * consensus.COIN},
  {height: consensus.INT_MAX, amount: 20}
];

// smart nodes rewards
testnet.rewardPercentages = [
  {height: 1000, percentage: 0},
  {height: consensus.INT_MAX, percentage: 20}
];

testnet.futureRewardShare = {
  smartnode: 0.8,
  miner: 0.2,
  founder: 0.0
};

exports.testnet = testnet;
