/*!
 * invitem.js - inv item object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const bio = require('bufio');
const util = require('../utils/util');

/**
 * Inv Item
 * @alias module:primitives.InvItem
 * @constructor
 * @property {InvType} type
 * @property {Hash} hash
 */

class InvItem {
  /**
   * Create an inv item.
   * @constructor
   * @param {Number} type
   * @param {Hash} hash
   */

  constructor(type, hash) {
    this.type = type;
    this.hash = hash;
  }

  /**
   * get size of inv item
   * @return {Number}
   */

  getSize() {
    return 36;
  }

  /**
   * Write inv item to buffer writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeU32(this.type);
    bw.writeHash(this.hash);
    return bw;
  }

  /**
   * Serialize inv item.
   * @returns {Buffer}
   */

  toRaw() {
    return this.toWriter(bio.write(36)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.type = br.readU32();
    this.hash = br.readHash();
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate inv item from buffer reader.
   * @param {BufferReader} br
   * @returns {InvItem}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate inv item from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {InvItem}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }

  /**
   * Test whether the inv item is a block.
   * @returns {Boolean}
   */

  isBlock() {
    switch (this.type) {
      case InvItem.types.BLOCK:
      case InvItem.types.FILTERED_BLOCK:
      case InvItem.types.CMPCT_BLOCK:
        return true;
      default:
        return false;
    }
  }

  /**
   * Test whether the inv item is a tx.
   * @returns {Boolean}
   */

  isTX() {
    switch (this.type) {
      case InvItem.types.TX:
        return true;
      default:
        return false;
    }
  }

  /**
   * Get little-endian hash.
   * @returns {Hash}
   */

  rhash() {
    return util.revHex(this.hash);
  }
}

/**
 * Inv types.
 * @enum {Number}
 * @default
 */

InvItem.types = {
  TX: 1,
  BLOCK: 2,
    // The following can only occur in getdata. Invs always use TX or BLOCK.
  FILTERED_BLOCK: 3, //!< Defined in BIP37
    // Raptoreum message types
    // NOTE: declare non-implmented here, we must keep this enum consistent and backwards compatible
  LEGACY_TXLOCK_REQUEST: 4,
    /* TXLOCK_VOTE = 5, Legacy InstantSend and not used anymore  */
  SPORK: 6,
    /* 7 - 15 were used in old Raptoreum versions and were mainly budget and MN broadcast/ping related*/
  DSTX: 16,
  GOVERNANCE_OBJECT: 17,
  GOVERNANCE_OBJECT_VOTE: 18,
    /* 19 was used for MSG_SMARTNODE_VERIFY and is not supported anymore */
    // Nodes may always request a MSG_CMPCT_BLOCK in a getdata, however,
    // MSG_CMPCT_BLOCK should not appear in any invs except as a part of getdata.
  CMPCT_BLOCK: 20, //!< Defined in BIP152
  QUORUM_FINAL_COMMITMENT: 21,
  /* QUORUM_DUMMY_COMMITMENT = 22, */ // was shortly used on testnet/devnet/regtest
  QUORUM_CONTRIB: 23,
  QUORUM_COMPLAINT: 24,
  QUORUM_JUSTIFICATION: 25,
  QUORUM_PREMATURE_COMMITMENT: 26,
  /* MSG_QUORUM_DEBUG_STATUS = 27, */ // was shortly used on testnet/devnet/regtest
  QUORUM_RECOVERED_SIG: 28,
  CLSIG: 29,
  ISLOCK: 30
};

/**
 * Inv types by value.
 * @const {Object}
 */

InvItem.typesByVal = {
  1: 'TX',
  2: 'BLOCK',
  3: 'FILTERED_BLOCK',
  4: 'LEGACY_TXLOCK_REQUEST',
  6: 'SPORK',
  16: 'DSTX',
  17: 'GOVERNANCE_OBJECT',
  18: 'GOVERNANCE_OBJECT_VOTE',
  20: 'CMPCT_BLOCK',
  21: 'QUORUM_FINAL_COMMITMENT',
  23: 'QUORUM_CONTRIB',
  24: 'QUORUM_COMPLAINT',
  25: 'QUORUM_JUSTIFICATION',
  26: 'QUORUM_PREMATURE_COMMITMENT',
  28: 'QUORUM_RECOVERED_SIG',
  29: 'CLSIG',
  30: 'ISLOCK'
};

/*
 * Expose
 */

module.exports = InvItem;
