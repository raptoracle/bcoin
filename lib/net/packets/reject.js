/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const assert = require('bsert');
const bio = require('bufio');
const util = require('../../utils/util');
const TX = require('../../primitives/tx');
const {encoding} = bio;
const {inspectSymbol} = require('../../utils');

/**
 * Reject Packet
 * @extends Packet
 * @property {(Number|String)?} code - Code
 * (see {@link RejectPacket.codes}).
 * @property {String?} msg - Message.
 * @property {String?} reason - Reason.
 * @property {(Hash|Buffer)?} data - Transaction or block hash.
 */

class RejectPacket extends Packet {
  /**
   * Create reject packet.
   * @constructor
   */

  constructor(options) {
    super();

    this.cmd = 'reject';
    this.type = Types.typesByIndex.REJECT;

    this.message = '';
    this.code = RejectPacket.codes.INVALID;
    this.reason = '';
    this.hash = null;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    let code = options.code;

    if (options.message)
      this.message = options.message;

    if (code != null) {
      if (typeof code === 'string')
        code = RejectPacket.codes[code.toUpperCase()];

      if (code >= RejectPacket.codes.INTERNAL)
        code = RejectPacket.codes.INVALID;

      this.code = code;
    }

    if (options.reason)
      this.reason = options.reason;

    if (options.hash)
      this.hash = options.hash;

    return this;
  }

  /**
   * Instantiate reject packet from options.
   * @param {Object} options
   * @returns {RejectPacket}
   */

  static fromOptions(options) {
    return new this().fromOptions(options);
  }

  /**
   * Get uint256le hash if present.
   * @returns {Hash}
   */

  rhash() {
    return this.hash ? util.revHex(this.hash) : null;
  }

  /**
   * Get symbolic code.
   * @returns {String}
   */

  getCode() {
    const code = RejectPacket.codesByVal[this.code];

    if (!code)
      return this.code.toString(10);

    return code.toLowerCase();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;

    size += encoding.sizeVarString(this.message, 'ascii');
    size += 1;
    size += encoding.sizeVarString(this.reason, 'ascii');

    if (this.hash)
      size += 32;

    return size;
  }

  /**
   * Serialize reject packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    assert(this.message.length <= 12);
    assert(this.reason.length <= 111);

    bw.writeVarString(this.message, 'ascii');
    bw.writeU8(this.code);
    bw.writeVarString(this.reason, 'ascii');

    if (this.hash)
      bw.writeHash(this.hash);

    return bw;
  }

  /**
   * Serialize reject packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.message = br.readVarString('ascii', 12);
    this.code = br.readU8();
    this.reason = br.readVarString('ascii', 111);

    switch (this.message) {
      case 'block':
      case 'tx':
        this.hash = br.readHash();
        break;
      default:
        this.hash = null;
        break;
    }

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate reject packet from buffer reader.
   * @param {BufferReader} br
   * @returns {RejectPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate reject packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {RejectPacket}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data, enc);
  }

  /**
   * Inject properties from reason message and object.
   * @private
   * @param {Number|String} code
   * @param {String} reason
   * @param {String?} msg
   * @param {Hash?} hash
   */

  fromReason(code, reason, msg, hash) {
    if (typeof code === 'string')
      code = RejectPacket.codes[code.toUpperCase()];

    if (!code)
      code = RejectPacket.codes.INVALID;

    if (code >= RejectPacket.codes.INTERNAL)
      code = RejectPacket.codes.INVALID;

    this.message = '';
    this.code = code;
    this.reason = reason;

    if (msg) {
      assert(hash);
      this.message = msg;
      this.hash = hash;
    }

    return this;
  }

  /**
   * Instantiate reject packet from reason message.
   * @param {Number} code
   * @param {String} reason
   * @param {String?} msg
   * @param {Hash?} hash
   * @returns {RejectPacket}
   */

  static fromReason(code, reason, msg, hash) {
    return new this().fromReason(code, reason, msg, hash);
  }

  /**
   * Instantiate reject packet from verify error.
   * @param {VerifyError} err
   * @param {(TX|Block)?} obj
   * @returns {RejectPacket}
   */

  static fromError(err, obj) {
    return this.fromReason(err.code, err.reason, obj);
  }

  /**
   * Inspect reject packet.
   * @returns {String}
   */

  [inspectSymbol]() {
    const code = RejectPacket.codesByVal[this.code] || this.code;
    const hash = this.hash ? util.revHex(this.hash) : null;
    return '<Reject:'
      + ` msg=${this.message}`
      + ` code=${code}`
      + ` reason=${this.reason}`
      + ` hash=${hash}`
      + '>';
  }
}

/**
 * Reject codes. Note that `internal` and higher
 * are not meant for use on the p2p network.
 * @enum {Number}
 * @default
 */

RejectPacket.codes = {
  MALFORMED: 0x01,
  INVALID: 0x10,
  OBSOLETE: 0x11,
  DUPLICATE: 0x12,
  NONSTANDARD: 0x40,
  DUST: 0x41,
  INSUFFICIENTFEE: 0x42,
  CHECKPOINT: 0x43,
  // Internal codes (NOT FOR USE ON NETWORK)
  INTERNAL: 0x100,
  HIGHFEE: 0x101,
  ALREADYKNOWN: 0x102,
  CONFLICT: 0x103
};

/**
 * Reject codes by value.
 * @const {Object}
 */

RejectPacket.codesByVal = {
  0x01: 'MALFORMED',
  0x10: 'INVALID',
  0x11: 'OBSOLETE',
  0x12: 'DUPLICATE',
  0x40: 'NONSTANDARD',
  0x41: 'DUST',
  0x42: 'INSUFFICIENTFEE',
  0x43: 'CHECKPOINT',
  // Internal codes (NOT FOR USE ON NETWORK)
  0x100: 'INTERNAL',
  0x101: 'HIGHFEE',
  0x102: 'ALREADYKNOWN',
  0x103: 'CONFLICT'
};

/*
 * Expose
 */

module.exports = RejectPacket;
