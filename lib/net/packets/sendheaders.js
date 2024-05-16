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
 * SendHeaders Packet
 * @extends Packet
 */

class SendHeadersPacket extends Packet {
  /**
   * Create a `sendheaders` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'sendheaders';
    this.type = Types.typesByIndex.SENDHEADERS;
  }

  /**
   * Instantiate sendheaders packet from buffer reader.
   * @param {BufferReader} br
   * @returns {SendHeadersPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate sendheaders packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {SendHeadersPacket}
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

module.exports = SendHeadersPacket;
