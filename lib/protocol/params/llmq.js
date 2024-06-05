/*!
 * llmq.js - LLMQ for bcoin
 * Copyright (c) 2024, socialruins (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

/**
 * @module blockchain/params/llmq
 */

const llmq = exports;

llmq.LLMQ_TYPES = {
  LLMQ_NONE: 0xff,
  // 50 members, 30 (60%) threshold, one per hour (24 blocks)
  LLMQ_TYPE_50_60: 1,
  // 400 members, 240 (60%) threshold, one every 12 hours (288 blocks)
  LLMQ_TYPE_400_60: 2,
  // 400 members, 340 (85%) threshold, one every 24 hours (576 blocks)
  LLMQ_TYPE_400_85: 3,
  // 100 members, 67 (67%) threshold, one every 24 hours (576 blocks)
  LLMQ_TYPE_100_67: 4,
  // for testing only
  // 5 members, 3 (60%) threshold, one per hour. Params might be different when use -llmqtestparams
  LLMQ_TYPE_5_60: 100,
  // 3 members, 2 (66%) threshold, one per hour
  LLMQ_TYPE_TEST_V17: 101,
};

llmq.llmq200_2 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_50_60,
  name: "llmq_3_200",
  size: 200,
  minSize: 2,
  threshold: 2,

  dkgInterval: 30, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 8,

  signingActiveQuorumCount: 2, // just a few ones to allow easier testing

  keepOldConnections: 3,
  recoveryMembers: 3,
};

llmq.llmq3_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_50_60,
  name: "llmq_3_60",
  size: 3,
  minSize: 2,
  threshold: 2,

  dkgInterval: 30, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 2,

  signingActiveQuorumCount: 2, // just a few ones to allow easier testing

  keepOldConnections: 3,
};

llmq.llmq5_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_60,
  name: "llmq_20_60",
  size: 5,
  minSize: 4,
  threshold: 3,

  dkgInterval: 30 * 12, // one DKG every 12 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 28,
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // two days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 5,
};

llmq.llmq5_85 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_85,
  name: "llmq_20_85",
  size: 5,
  minSize: 4,
  threshold: 3,

  dkgInterval: 30 * 24, // one DKG every 24 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 48, // give it a larger mining window to make sure it is mined
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // four days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 5,
};

llmq.llmq20_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_60,
  name: "llmq_20_60",
  size: 20,
  minSize: 15,
  threshold: 12,

  dkgInterval: 30 * 12, // one DKG every 12 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 28,
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // two days worth of LLMQs

  keepOldConnections: 5,
};

llmq.llmq20_85 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_85,
  name: "llmq_20_85",
  size: 20,
  minSize: 18,
  threshold: 17,

  dkgInterval: 30 * 24, // one DKG every 24 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 48, // give it a larger mining window to make sure it is mined
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // four days worth of LLMQs

  keepOldConnections: 5,
};

llmq.llmq10_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_50_60,
  name: "llmq_10_60",
  size: 10,
  minSize: 8,
  threshold: 7,

  dkgInterval: 30, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 8,

  signingActiveQuorumCount: 6, // just a few ones to allow easier testing

  keepOldConnections: 7,
  recoveryMembers: 7,
};

llmq.llmq40_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_60,
  name: "llmq_40_60",
  size: 40,
  minSize: 30,
  threshold: 24,

  dkgInterval: 30 * 12, // one DKG every 12 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 28,
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // two days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 5,
};

llmq.llmq40_85 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_85,
  name: "llmq_40_85",
  size: 40,
  minSize: 35,
  threshold: 34,

  dkgInterval: 30 * 24, // one DKG every 24 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 48, // give it a larger mining window to make sure it is mined
  dkgBadVotesThreshold: 30,

  signingActiveQuorumCount: 4, // four days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 5,
};

llmq.llmq50_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_50_60,
  name: "llmq_50_60",
  size: 50,
  minSize: 40,
  threshold: 30,

  dkgInterval: 30, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 40,

  signingActiveQuorumCount: 24, // a full day worth of LLMQs

  keepOldConnections: 25,
  recoveryMembers: 25,
};

llmq.llmq400_60 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_60,
  name: "llmq_400_60",
  size: 400,
  minSize: 300,
  threshold: 240,

  dkgInterval: 30 * 12, // one DKG every 12 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 28,
  dkgBadVotesThreshold: 300,

  signingActiveQuorumCount: 4, // two days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 100,
};

// Used for deployment and min-proto-version signalling, so it needs a higher threshold
llmq.llmq400_85 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_400_85,
  name: "llmq_400_85",
  size: 400,
  minSize: 350,
  threshold: 340,

  dkgInterval: 30 * 24, // one DKG every 24 hours
  dkgPhaseBlocks: 4,
  dkgMiningWindowStart: 20, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 48, // give it a larger mining window to make sure it is mined
  dkgBadVotesThreshold: 300,

  signingActiveQuorumCount: 4, // four days worth of LLMQs

  keepOldConnections: 5,
  recoveryMembers: 100,
};

// this one is for testing only
llmq.llmq_test_v17 = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_TEST_V17,
  name: "llmq_test_v17",
  size: 3,
  minSize: 2,
  threshold: 2,

  dkgInterval: 24, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 2,

  signingActiveQuorumCount: 2, // just a few ones to allow easier testing

  keepOldConnections: 3,
  recoveryMembers: 3,
};

// Used for Platform
llmq.llmq100_67_mainnet = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_100_67,
  name: "llmq_100_67",
  size: 100,
  minSize: 80,
  threshold: 67,

  dkgInterval: 30, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 80,

  signingActiveQuorumCount: 24, // a full day worth of LLMQs

  keepOldConnections: 25,
  recoveryMembers: 50,
};


// Used for Platform
llmq.llmq100_67_testnet = {
  type: llmq.LLMQ_TYPES.LLMQ_TYPE_100_67,
  name: "llmq_100_67",
  size: 100,
  minSize: 80,
  threshold: 67,

  dkgInterval: 24, // one DKG per hour
  dkgPhaseBlocks: 2,
  dkgMiningWindowStart: 10, // dkgPhaseBlocks * 5: after finalization
  dkgMiningWindowEnd: 18,
  dkgBadVotesThreshold: 80,

  signingActiveQuorumCount: 24, // a full day worth of LLMQs

  keepOldConnections: 25,
  recoveryMembers: 50,
};

exports.getLLMQParams = function getLLMQParams(llmqType) {
  const params = {};
  switch (llmqType) {
    case llmq.LLMQ_TYPES.LLMQ_TYPE_50_60:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    case llmq.LLMQ_TYPES.LLMQ_TYPE_400_60:
      params.size = 20;
      params.minSize = 15;
      params.threshold = 12;
      params.maximumActiveQuorumsCount = 4;
      return params;
    case llmq.LLMQ_TYPES.LLMQ_TYPE_400_85:
      params.size = 20;
      params.minSize = 18;
      params.threshold = 17;
      params.maximumActiveQuorumsCount = 4;
      return params;
    case llmq.LLMQ_TYPES.LLMQ_TYPE_100_67:
      params.size = 100;
      params.minSize = 80;
      params.threshold = 67;
      params.maximumActiveQuorumsCount = 24;
      return params;
    case llmq.LLMQ_TYPES.LLMQ_TYPE_5_60:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    case llmq.LLMQ_TYPES.LLMQ_TYPE_TEST_V17:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    default:
      throw new Error(`Invalid llmq type ${llmqType}`);
  }
};
