/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const MemBlock = require('../../primitives/memblock');

/**
 * Block Packet
 * @extends Packet
 * @property {Block} block
 * @property {Boolean} witness
 */

class BlockPacket extends Packet {
  /**
   * Create a `block` packet.
   * @constructor
   * @param {Block|null} block
   */

  constructor(block) {
    super();

    this.cmd = 'block';
    this.type = Types.typesByIndex.BLOCK;

    this.block = block || new MemBlock();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.block.getSize();
  }

  /**
   * Serialize block packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.block.toWriter(bw);
  }

  /**
   * Serialize block packet.
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
   * Instantiate block packet from buffer reader.
   * @param {BufferReader} br
   * @returns {BlockPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate block packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {BlockPacket}
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

module.exports = BlockPacket;
