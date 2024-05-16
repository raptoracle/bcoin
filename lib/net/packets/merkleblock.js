/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const MerkleBlock = require('../../primitives/merkleblock');

/**
 * MerkleBlock Packet
 * @extends Packet
 * @property {MerkleBlock} block
 */

class MerkleBlockPacket extends Packet {
  /**
   * Create a `merkleblock` packet.
   * @constructor
   * @param {MerkleBlock?} block
   */

  constructor(block) {
    super();

    this.cmd = 'merkleblock';
    this.type = Types.typesByIndex.MERKLEBLOCK;

    this.block = block || new MerkleBlock();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.block.getSize();
  }

  /**
   * Serialize merkleblock packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.block.toWriter(bw);
  }

  /**
   * Serialize merkleblock packet.
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
   * Instantiate merkleblock packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {MerkleBlockPacket}
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

module.exports = MerkleBlockPacket;
