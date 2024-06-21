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
 * Devnet
 */

const devnet = {};

devnet.type = 'devnet';

devnet.seeds = [
  '47.151.26.43:19799'
];

devnet.magic = 0xceffcae2; //6d747274

devnet.port = 19799;

devnet.checkpointMap = {
  0: b('6d195b5563f3fea862d1ad151f3de7e568bb139ea3d8ee68b398580e493a504c'),
};

devnet.lastCheckpoint = 0;

devnet.txnData = {
  rate: 0, // * estimated number of transactions per second after that timestamp
  time: 0, // * UNIX timestamp of last known number of transactions (Block 0)
  count: 0 // * total number of transactions between genesis and that timestamp, (the tx=... number in the SetBestChain debug.log lines)
};

devnet.halvingInterval = 210240;

devnet.genesis = {
  version: 4,
  hash: b('6d195b5563f3fea862d1ad151f3de7e568bb139ea3d8ee68b398580e493a504c'),
  prevBlock:
    b('0000000000000000000000000000000000000000000000000000000000000000'),
  merkleRoot:
    b('e87a48bc22468acdd72ee540aab7c086a5bbcddc12b51c6ac925717a74c269453'),
  time: 1688535726,
  bits: 536879103,
  nonce: 2841,
  height: 0
};

devnet.genesisBlock =
    '0400000000000000000000000000000000000000000000000000000000000000000000'
  + '005394264ca7175792acc6512bc1ddbc5b6a087cab0a54ee72ddac6824c28ba4875dfb'
  + 'fc65ff1f0020cb03000001010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff5804ffff001d01044c4f5468652054696d65'
  + '732032322f4a616e2f3230313820526170746f7265756d206973206e616d65206f6620'
  + '7468652067616d6520666f72206e65772067656e65726174696f6e206f66206669726d'
  + '73ffffffff010088526a740000004341040184710fa689ad5023690c80f3a49c8f13f8'
  + 'd45b8c857fbcbc8bc4a8e4d3eb4b10f4d4604fa08dce601aaf0f470216fe1b51850b4a'
  + 'cf21b179c45070ac7b03a9ac00000000';

devnet.pow = {
  limit: new BN(
    '7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
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

devnet.block = {
  bipCSVEnabled: true,
  bip147Enabled: true,
  bip34Enabled: true,
  bip34height: 0, //5c7aad59fd281029fba98b04a362d84843e579590e367f9cb0bbb3f9b6ee062b
  bip34hash:
    b('6d195b5563f3fea862d1ad151f3de7e568bb139ea3d8ee68b398580e493a504c'),
  bip65Enabled: true,
  bip65height: 0,
  bip65hash:
    b('6d195b5563f3fea862d1ad151f3de7e568bb139ea3d8ee68b398580e493a504c'),
  bip66enabled: true,
  bip66height: 0,
  bip66hash:
    b('6d195b5563f3fea862d1ad151f3de7e568bb139ea3d8ee68b398580e493a504c'),
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

devnet.bip30 = {};

devnet.activationThreshold = 1512; // 75% for testchains

devnet.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

devnet.deployments = {
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

devnet.deploys = [
  devnet.deployments.v17,
  devnet.deployments.testdummy
];

devnet.keyPrefix = {
  privkey: 0xef,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

devnet.addressPrefix = {
  pubkeyhash: 0x8c,
  scripthash: 0x13,
  bech32: null
};

devnet.requireStandard = false;

devnet.rpcPort = 9998;

devnet.walletPort = 9997;

devnet.minRelay = 1000;

devnet.feeRate = 5000;

devnet.maxFeeRate = 400000;

devnet.selfConnect = false;

devnet.requestMempool = false;

// privkey cVpnZj4dZvRXmBf7Jze1GjpLQb25iKP92GDXUsKdUJTXhXRo2RFA
devnet.vSporkAddresses = ['yYhBxduZLMnancMkpzvcLFCiTgZRSk8wun'];
devnet.nMinSporkKeys = 1;
// devnets are started with no blocks and no MN, so we can't check for upgraded MN (as there are none)
devnet.fBIP9CheckSmartnodesUpgraded = false;

devnet.defaultFounderAddress = "yYhBxduZLMnancMkpzvcLFCiTgZRSk8wun";

devnet.rewardStructures = [{ height: consensus.INT_MAX, percentage: 5}];

// smartnodes 
devnet.nSmartnodePaymentsStartBlock = 4010; // not true, but it's ok as long as it's less then nSmartnodePaymentsIncreaseBlock
devnet.nSmartnodePaymentsIncreaseBlock = 4030;
devnet.nSmartnodePaymentsIncreasePeriod = 10;

//smart nodes collaterals
devnet.collaterals = [
  {height: consensus.INT_MAX, amount: 60000 * consensus.COIN},
  {height: consensus.INT_MAX, amount: 20}
];

// smart nodes reward percentages
 devnet.rewardPercentages = [
  {height: 4010, percentage: 0},
  {height: consensus.INT_MAX, percentage: 20}
];

devnet.futureRewardShare = {
  smartnode: 0.8,
  miner: 0.2,
  founder: 0.0
};

exports.devnet = devnet;
