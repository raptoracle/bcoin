/*!
 * common.js - primitives constants for bcoin
 * Copyright (c) 2024, socialruins (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

exports.constants = {
  isCore17: true,
  // Public key id size in bytes
  PUBKEY_ID_SIZE: 20,
  // Standard compact size variable, size in bytes
  COMPACT_SIGNATURE_SIZE: 65,
  // SHA256 hash size in bytes
  SHA256_HASH_SIZE: 32,
  // Quorum BLS Public Key size in bytes
  BLS_PUBLIC_KEY_SIZE: 48,
  // BLS Signature size in bytes
  BLS_SIGNATURE_SIZE: 96,
  // Platform Node ID size
  PLATFORM_NODE_ID_SIZE: 20,

  MASTERNODE_TYPE_BASIC: 0,

  MASTERNODE_TYPE_HP: 1,

  registeredTransactionTypes: {
    TRANSACTION_NORMAL: 0,
    TRANSACTION_PROVIDER_REGISTER: 1,
    TRANSACTION_PROVIDER_UPDATE_SERVICE: 2,
    TRANSACTION_PROVIDER_UPDATE_REGISTRAR: 3,
    TRANSACTION_PROVIDER_UPDATE_REVOKE: 4,
    TRANSACTION_COINBASE: 5,
    TRANSACTION_QUORUM_COMMITMENT: 6,
    TRANSACTION_FUTURE: 7,
    TRANSACTION_NEW_ASSET: 8,
    TRANSACTION_UPDATE_ASSET: 9,
    TRANSACTION_MINT_ASSET: 10,
  },
  registeredTransactionNames: [
    "Normal",
    "proRegTx",
    "proUpServTx",
    "proUpRegTx",
    "proUpRevTx",
    "cbTx",
    "qcTx",
    "futureTx",
    "newAssetTx",
    "upAssetTx",
    "mintAssetTx",
  ],
  EMPTY_SIGNATURE_SIZE: 0,
  primitives: {
    BOOLEAN: 1,
  },
  ipAddresses: {
    IPV4MAPPEDHOST: 16,
    PORT: 2,
  },
  SML_ENTRY_VERSION_1_SIZE: 151,
  SML_ENTRY_TYPE_2_ADDITION_SIZE: 22,
  NULL_HASH: '0000000000000000000000000000000000000000000000000000000000000000',
  // In duffs
  INSTANTSEND_FEE_PER_INPUT: 10000,
  LLMQ_TYPES: {
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
  },

  // when selecting a quorum for signing and verification, we use this offset as
  // starting height for scanning. This is because otherwise the resulting signatures
  // would not be verifiable by nodes which are not 100% at the chain tip.
  LLMQ_SIGN_HEIGHT_OFFSET: 8,

  // keep diffs for 30 hours (720 blocks)
  SMLSTORE_MAX_DIFFS: 720,

  HASH_QUORUM_INDEX_REQUIRED_VERSION: 2,
  BASIC_BLS_SCHEME_VERSION: 3,
  BASIC_BLS_SCHEME_HASH_QUORUM_INDEX_REQUIRED_VERSION: 4,
};

exports.getDistributionType = function getDistributionType(t) {
  switch (t) {
    case 0:
      return "manual";
    case 1:
      return "coinbase";
    case 2:
      return "address";
    case 3:
      return "schedule";
  }
  return "invalid";
};

exports.getLLMQParams = function getLLMQParams(llmqType) {
  const params = {};
  switch (llmqType) {
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_50_60:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_400_60:
      params.size = 20;
      params.minSize = 15;
      params.threshold = 12;
      params.maximumActiveQuorumsCount = 4;
      return params;
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_400_85:
      params.size = 20;
      params.minSize = 18;
      params.threshold = 17;
      params.maximumActiveQuorumsCount = 4;
      return params;
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_100_67:
      params.size = 100;
      params.minSize = 80;
      params.threshold = 67;
      params.maximumActiveQuorumsCount = 24;
      return params;
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_5_60:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    case exports.constants.LLMQ_TYPES.LLMQ_TYPE_TEST_V17:
      params.size = 3;
      params.minSize = 2;
      params.threshold = 2;
      params.maximumActiveQuorumsCount = 2;
      return params;
    default:
      throw new Error(`Invalid llmq type ${llmqType}`);
  }
};

/**
 *
 * @param {number} version
 * @return {boolean}
 */
exports.isHashQuorumIndexRequired = function isHashQuorumIndexRequired(version) {
  return version === exports.constants.HASH_QUORUM_INDEX_REQUIRED_VERSION
    || version === exports.constants.BASIC_BLS_SCHEME_HASH_QUORUM_INDEX_REQUIRED_VERSION;
};
