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
const Headers = require('../../primitives/headers');
const {encoding} = bio;

/**
 * Headers Packet
 * @extends Packet
 * @property {Headers[]} items
 */

class HeadersPacket extends Packet {
  /**
   * Create a `headers` packet.
   * @constructor
   * @param {(Headers[])?} items
   */

  constructor(items) {
    super();

    this.cmd = 'headers';
    this.type = Types.typesByIndex.HEADERS;

    this.items = items || [];
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;

    size += encoding.sizeVarint(this.items.length);

    for (const item of this.items)
      size += item.getSize();

    return size;
  }

  /**
   * Serialize headers packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    assert(this.items.length <= 2000, 'Too many headers.');

    bw.writeVarint(this.items.length);

    for (const item of this.items)
      item.toWriter(bw);

    return bw;
  }

  /**
   * Serialize headers packet.
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

    assert(count <= 2000, 'Too many headers.');

    for (let i = 0; i < count; i++)
      this.items.push(Headers.fromReader(br));

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
   * Instantiate headers packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {VerackPacket}
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

module.exports = HeadersPacket;
