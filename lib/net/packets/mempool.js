/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');

/**
 * Mempool Packet
 * @extends Packet
 */

class MempoolPacket extends Packet {
  /**
   * Create a `mempool` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'mempool';
    this.type = Types.typesByIndex.MEMPOOL;
  }

  /**
   * Instantiate mempool packet from buffer reader.
   * @param {BufferReader} br
   * @returns {VerackPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate mempool packet from serialized data.
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

module.exports = MempoolPacket;
