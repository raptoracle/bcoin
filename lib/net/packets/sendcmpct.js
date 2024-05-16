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
 * SendCmpct Packet
 * @extends Packet
 * @property {Number} mode
 * @property {Number} version
 */

class SendCmpctPacket extends Packet {
  /**
   * Create a `sendcmpct` packet.
   * @constructor
   * @param {Number|null} mode
   * @param {Number|null} version
   */

  constructor(mode, version) {
    super();

    this.cmd = 'sendcmpct';
    this.type = Types.typesByIndex.SENDCMPCT;

    this.mode = mode || 0;
    this.version = version || 1;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 9;
  }

  /**
   * Serialize sendcmpct packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeU8(this.mode);
    bw.writeU64(this.version);
    return bw;
  }

  /**
   * Serialize sendcmpct packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.toWriter(bio.write(9)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.mode = br.readU8();
    this.version = br.readU64();
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
   * Instantiate sendcmpct packet from buffer reader.
   * @param {BufferReader} br
   * @returns {SendCmpctPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate sendcmpct packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {SendCmpctPacket}
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

module.exports = SendCmpctPacket;
