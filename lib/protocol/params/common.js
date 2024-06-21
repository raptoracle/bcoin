/*!
 * common.js - blockchain constants for bcoin
 * Copyright (c) 2024, socialruins (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

exports.algorithm = 'ghostrider';
exports.isCore17 = true;
exports.fDIP0001Active = true;
exports.fDIP0003Active = true;
// Public key id size in bytes
exports.PUBKEY_ID_SIZE = 20;
// Standard compact size variable, size in bytes
exports.COMPACT_SIGNATURE_SIZE = 65;
// SHA256 hash size in bytes
exports.SHA256_HASH_SIZE = 32;
// Quorum BLS Public Key size in bytes
exports.BLS_PUBLIC_KEY_SIZE = 48;
// BLS Signature size in bytes
exports.BLS_SIGNATURE_SIZE = 96;
// Platform Node ID size
exports.PLATFORM_NODE_ID_SIZE = 20;

exports.MASTERNODE_TYPE_BASIC = 0;
exports.MASTERNODE_TYPE_HP = 1;

exports.registeredTransactionTypes = {
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
};

exports.registeredTransactionNames = [
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
];

exports.EMPTY_SIGNATURE_SIZE = 0;
exports.primitives = {
  BOOLEAN: 1,
};
exports.ipAddresses = {
  IPV4MAPPEDHOST: 16,
  PORT: 2,
};

exports.SML_ENTRY_VERSION_1_SIZE = 151;
exports.SML_ENTRY_TYPE_2_ADDITION_SIZE = 22;
exports.NULL_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// In duffs
exports.INSTANTSEND_FEE_PER_INPUT = 10000;

// when selecting a quorum for signing and verification, we use this offset as
// starting height for scanning. This is because otherwise the resulting signatures
// would not be verifiable by nodes which are not 100% at the chain tip.
exports.LLMQ_SIGN_HEIGHT_OFFSET = 8;
// keep diffs for 30 hours (720 blocks)
exports.SMLSTORE_MAX_DIFFS = 720;

exports.HASH_QUORUM_INDEX_REQUIRED_VERSION = 2;
exports.BASIC_BLS_SCHEME_VERSION = 3;
exports.BASIC_BLS_SCHEME_HASH_QUORUM_INDEX_REQUIRED_VERSION = 4;

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

/**
 *
 * @param {number} version
 * @return {boolean}
 */
exports.isHashQuorumIndexRequired = function isHashQuorumIndexRequired(version) {
  return version === exports.HASH_QUORUM_INDEX_REQUIRED_VERSION
    || version === exports.BASIC_BLS_SCHEME_HASH_QUORUM_INDEX_REQUIRED_VERSION;
};
