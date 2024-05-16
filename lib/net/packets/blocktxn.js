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
 * BlockTxn Packet
 * @extends Packet
 * @property {TXResponse} response
 * @property {Boolean} witness
 */

class BlockTxnPacket extends Packet {
  /**
   * Create a `blocktxn` packet.
   * @constructor
   * @param {TXResponse?} response
   */

  constructor(response) {
    super();

    this.cmd = 'blocktxn';
    this.type = Types.typesByIndex.BLOCKTXN;

    this.response = response || new bip152.TXResponse();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.response.getSize();
  }

  /**
   * Serialize blocktxn packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.response.toWriter(bw);
  }

  /**
   * Serialize blocktxn packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.response.toRaw();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.response.fromReader(br);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    this.response.fromRaw(data);
    return this;
  }

  /**
   * Instantiate blocktxn packet from buffer reader.
   * @param {BufferReader} br
   * @returns {BlockTxnPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate blocktxn packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {BlockTxnPacket}
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

module.exports = BlockTxnPacket;
