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
const common = require('../common');
const InvItem = require('../../primitives/invitem');
const {encoding} = bio;

/**
 * Inv Packet
 * @extends Packet
 * @property {InvItem[]} items
 */

class InvPacket extends Packet {
  /**
   * Create a `inv` packet.
   * @constructor
   * @param {(InvItem[])?} items
   */

  constructor(items) {
    super();

    this.cmd = 'inv';
    this.type = Types.typesByIndex.INV;

    this.items = items || [];
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += encoding.sizeVarint(this.items.length);
    size += 36 * this.items.length;
    return size;
  }

  /**
   * Serialize inv packet to writer.
   * @param {Buffer} bw
   */

  toWriter(bw) {
    assert(this.items.length <= common.MAX_INV);

    bw.writeVarint(this.items.length);

    for (const item of this.items)
      item.toWriter(bw);

    return bw;
  }

  /**
   * Serialize inv packet.
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
    const count = br.readVarint();

    assert(count <= common.MAX_INV, 'Inv item count too high.');

    for (let i = 0; i < count; i++)
      this.items.push(InvItem.fromReader(br));

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
   * Instantiate inv packet from buffer reader.
   * @param {BufferReader} br
   * @returns {InvPacket}
   */

  static fromReader(br) {
    return new this().fromRaw(br);
  }

  /**
   * Instantiate inv packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {InvPacket}
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

module.exports = InvPacket;
