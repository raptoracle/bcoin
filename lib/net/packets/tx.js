/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const TX = require('../../primitives/tx');

/**
 * TX Packet
 * @extends Packet
 * @property {TX} block
 */

class TXPacket extends Packet {
  /**
   * Create a `tx` packet.
   * @constructor
   * @param {TX|null} tx
   */

  constructor(tx) {
    super();

    this.cmd = 'tx';
    this.type = Types.typesByIndex.TX;

    this.tx = tx || new TX();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.tx.getSize();
  }

  /**
   * Serialize tx packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.tx.toWriter(bw);
  }

  /**
   * Serialize tx packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.tx.toRaw();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.tx.fromRaw(br);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    this.tx.fromRaw(data);
    return this;
  }

  /**
   * Instantiate tx packet from buffer reader.
   * @param {BufferReader} br
   * @returns {TXPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate tx packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {TXPacket}
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

module.exports = TXPacket;
