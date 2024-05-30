/*!
 * common.js - p2p constants for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

/**
 * @module net/common
 */

const random = require('bcrypto/lib/random');
const pkg = require('../pkg');

/**
 * Default protocol version.
 * @const {Number}
 * @default
 */

exports.PROTOCOL_VERSION = 70219;

/**
 * Minimum protocol version we're willing to talk to. aka MIN_PEER_PROTO_VERSION
 * @const {Number}
 * @default
 */

exports.OLD_MIN_PEER_PROTO_VERSION = 70213;
exports.MIN_VERSION = 70213;

/**
 * Minimum version for getheaders.
 * @const {Number}
 * @default
 */

exports.HEADERS_VERSION = 70213;

/**
 * Minimum version for pong.
 * @const {Number}
 * @default
 */

exports.PONG_VERSION = 70213;

/**
 * Minimum version for bip37.
 * @const {Number}
 * @default
 */

exports.BLOOM_VERSION = 70213;

/**
 * Minimum version for bip152.
 * @const {Number}
 * @default
 */

exports.SENDHEADERS_VERSION = 70213;

/**
 * Minimum version for bip152.
 * @const {Number}
 * @default
 */

exports.COMPACT_VERSION = 70213;

/**
 * Service bits.
 * @enum {Number}
 * @default
 */

exports.services = {
  /**
   * Whether network services are enabled.
   */

  NODE_NETWORK: 1 << 0,

  /**
   * Whether the peer supports the getutxos packet.
   */

  NODE_GETUTXO: 1 << 1,

  /**
   * Whether the peer supports BIP37.
   */

  NODE_BLOOM: 1 << 2,

  /**
   * Whether the peer supports Xtreme Thinblocks
   */

  NODE_XTHIN: 1 << 4,
  /**
   * Whether the peer supports compact blocks.
   */

  NODE_COMPACT_FILTERS: 1 << 6,

  /**
   * NETWORK_LIMITED means the same as NETWORK with the limitation of only
   * serving the last 288 blocks
   * See BIP159 for details on how this is implemented.
   */

  NODE_NETWORK_LIMITED: 1 << 10
};

/**
 * Bcoin's services (we support everything).
 * @const {Number}
 * @default
 */

exports.LOCAL_SERVICES = 0
  | exports.services.NODE_NETWORK;

/**
 * Required services (network and segwit).
 * @const {Number}
 * @default
 */

exports.REQUIRED_SERVICES = 0
  | exports.services.NODE_NETWORK;

/**
 * Default user agent: `/bcoin:[version]/`.
 * @const {String}
 * @default
 */

exports.USER_AGENT = `/raptoracle:${pkg.version}/`;

/**
 * Maximum length of incoming protocol messages (no message over 3 MiB is currently acceptable).
 * MAX_PROTOCOL_MESSAGE_LENGTH src/net.h:75
 * @const {Number}
 * @default
 */

exports.MAX_MESSAGE = 3 * 1024 * 1024;

/**
 * Amount of time to ban misbheaving peers.
 * DEFAULT_MISBEHAVING_BANTIME src/net.h:111
 * @const {Number}
 * @default
 */

exports.BAN_TIME = 24 * 60 * 60;

/**
 * Ban score threshold before ban is placed in effect.
 * @const {Number}
 * @default
 */

exports.BAN_SCORE = 100;

/**
 * Create a nonce.
 * @returns {Buffer}
 */

exports.nonce = function nonce() {
  return random.randomBytes(8);
};

/**
 * A compressed pubkey of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_KEY = Buffer.alloc(33, 0x00);

/**
 * A 64 byte signature of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_SIG = Buffer.alloc(64, 0x00);

/**
 * 8 zero bytes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_NONCE = Buffer.alloc(8, 0x00);

/**
 * Maximum inv/getdata size. The maximum number of entries in an 'inv' protocol message
 * MAX_INV_SZ
 * @const {Number}
 * @default
 */

exports.MAX_INV = 50000;

/**
 * Maximum number of requests.
 * @const {Number}
 * @default
 */

exports.MAX_REQUEST = 5000;

/**
 * Maximum number of block requests.
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_REQUEST = 50000 + 10000;

/**
 * Maximum number of tx requests.
 * @const {Number}
 * @default
 */

exports.MAX_TX_REQUEST = 10000;

/**
 * Compact filter types.
 */

exports.FILTERS = {
  BASIC: 0
};

exports.filtersByVal = {
  0: 'BASIC'
};

exports.MAX_CFILTERS = 1000;

exports.MAX_CFHEADERS = 2000;

/**
 * Raptoreum protocol version 
 */

//! minimum proto version of masternode to accept in DKGs
exports.OLD_MIN_SMARTNODE_PROTO_VERSION = 70218;
exports.MIN_SMARTNODE_PROTO_VERSION = 70219;

//! minimum proto version for governance sync and messages
exports.MIN_GOVERNANCE_PEER_PROTO_VERSION = 70213;

//! minimum proto version to broadcast governance messages from banned masternodes
exports.GOVERNANCE_POSE_BANNED_VOTES_VERSION = 70215;

//! nTime field added to CAddress, starting with this version;
//! if possible, avoid requesting addresses nodes older than this
exports.CADDR_TIME_VERSION = 31402;

//! introduction of LLMQs
exports.LLMQS_PROTO_VERSION = 70214;

//! minimum peer version accepted by mixing pool
exports.MIN_COINJOIN_PEER_PROTO_VERSION = 70213;

//! protocol version is included in MNAUTH starting with this version
exports.MNAUTH_NODE_VER_VERSION = 70218;

//! introduction of QGETDATA/QDATA messages
exports.LLMQ_DATA_MESSAGES_VERSION = 70219;
