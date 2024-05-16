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
 * Verack Packet
 * @extends Packet
 */

class VerackPacket extends Packet {
  /**
   * Create a `verack` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'verack';
    this.type = Types.typesByIndex.VERACK;
  }

  /**
   * Instantiate verack packet from serialized data.
   * @param {BufferReader} br
   * @returns {VerackPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate verack packet from serialized data.
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

module.exports = VerackPacket;
