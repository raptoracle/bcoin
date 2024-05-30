/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const bio = require('bufio');
const NetAddress = require('../netaddress');
const {encoding} = bio;

/**
 * Addr Packet
 * @extends Packet
 * @property {NetAddress[]} items
 */

class AddrPacket extends Packet {
  /**
   * Create a `addr` packet.
   * @constructor
   * @param {(NetAddress[])?} items
   */

  constructor(items) {
    super();

    this.cmd = 'addr';
    this.type = Types.typesByIndex.ADDR;
    //this.type = Types.typesByCmd.indexOf('ADDR');

    this.items = items || [];
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += encoding.sizeVarint(this.items.length);
    size += 30 * this.items.length;
    return size;
  }

  /**
   * Serialize addr packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeVarint(this.items.length);

    for (const item of this.items)
      item.toWriter(bw, true);

    return bw;
  }

  /**
   * Serialize addr packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);
    const count = br.readVarint();

    for (let i = 0; i < count; i++)
      this.items.push(NetAddress.fromReader(br, true));

    return this;
  }

  /**
   * Instantiate addr packet from Buffer reader.
   * @param {BufferReader} br
   * @returns {AddrPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate addr packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {AddrPacket}
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

module.exports = AddrPacket;
