/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const bip152 = require('../bip152');

/**
 * CmpctBlock Packet
 * @extends Packet
 * @property {Block} block
 * @property {Boolean} witness
 */

class CmpctBlockPacket extends Packet {
  /**
   * Create a `cmpctblock` packet.
   * @constructor
   * @param {Block|null} block
   */

  constructor(block) {
    super();

    this.cmd = 'cmpctblock';
    this.type = Types.typesByIndex.CMPCTBLOCK;

    this.block = block || new bip152.CompactBlock();
  }

  /**
   * Serialize cmpctblock packet.
   * @returns {Buffer}
   */

  getSize() {
    return this.block.getSize();
  }

  /**
   * Serialize cmpctblock packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.block.toWriter(bw);
  }

  /**
   * Serialize cmpctblock packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.block.toRaw();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.block.fromReader(br);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    this.block.fromRaw(data);
    return this;
  }

  /**
   * Instantiate cmpctblock packet from buffer reader.
   * @param {BufferReader} br
   * @returns {CmpctBlockPacket}
   */

  static fromReader(br) {
    return new this().fromRaw(br);
  }

  /**
   * Instantiate cmpctblock packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {CmpctBlockPacket}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = CmpctBlockPacket;
