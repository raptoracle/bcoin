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
 * GetBlockTxn Packet
 * @extends Packet
 * @property {TXRequest} request
 */

class GetBlockTxnPacket extends Packet {
  /**
   * Create a `getblocktxn` packet.
   * @constructor
   * @param {TXRequest?} request
   */

  constructor(request) {
    super();

    this.cmd = 'getblocktxn';
    this.type = Types.typesByIndex.GETBLOCKTXN;

    this.request = request || new bip152.TXRequest();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.request.getSize();
  }

  /**
   * Serialize getblocktxn packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.request.toWriter(bw);
  }

  /**
   * Serialize getblocktxn packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.request.toRaw();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.request.fromReader(br);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    this.request.fromRaw(data);
    return this;
  }

  /**
   * Instantiate getblocktxn packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetBlockTxnPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getblocktxn packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetBlockTxnPacket}
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

module.exports = GetBlockTxnPacket;
