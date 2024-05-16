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

/**
 * Ping Packet
 * @extends Packet
 * @property {Buffer|null} nonce
 */

class PingPacket extends Packet {
  /**
   * Create a `ping` packet.
   * @constructor
   * @param {Buffer?} nonce
   */

  constructor(nonce) {
    super();

    this.cmd = 'ping';
    this.type = Types.typesByIndex.PING;

    this.nonce = nonce || null;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.nonce ? 8 : 0;
  }

  /**
   * Serialize ping packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Serialize ping packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    if (this.nonce)
      bw.writeBytes(this.nonce);
    return bw;
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    if (br.left() >= 8)
      this.nonce = br.readBytes(8);
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
   * Instantiate ping packet from serialized data.
   * @param {BufferReader} br
   * @returns {PingPacket}
   */

  static fromReader(br) {
    return new this().fromRaw(br);
  }

  /**
   * Instantiate ping packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {PingPacket}
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

module.exports = PingPacket;
