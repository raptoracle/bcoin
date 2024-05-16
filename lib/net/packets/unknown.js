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

/**
 * Unknown Packet
 * @extends Packet
 * @property {String} cmd
 * @property {Buffer} data
 */

class UnknownPacket extends Packet {
  /**
   * Create an unknown packet.
   * @constructor
   * @param {String|null} cmd
   * @param {Buffer|null} data
   */

  constructor(cmd, data) {
    super();

    this.cmd = cmd;
    this.type = Types.typesByIndex.UNKNOWN;
    this.data = data;

  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.data.length;
  }

  /**
   * Serialize unknown packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeBytes(this.data);
    return bw;
  }

  /**
   * Serialize unknown packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.data;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {String} cmd
   * @param {Buffer} data
   */

  fromRaw(cmd, data) {
    assert(Buffer.isBuffer(data));
    this.cmd = cmd;
    this.data = data;
    return this;
  }

  /**
   * Instantiate unknown packet from serialized data.
   * @param {String} cmd
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {UnknownPacket}
   */

  static fromRaw(cmd, data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(cmd, data);
  }
}

/*
 * Expose
 */

module.exports = UnknownPacket;
