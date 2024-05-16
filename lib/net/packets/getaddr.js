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
 * GetAddr Packet
 * @extends Packet
 */

class GetAddrPacket extends Packet {
  /**
   * Create a `getaddr` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'getaddr';
    this.type = Types.typesByIndex.GETADDR;
  }

  /**
   * Instantiate getaddr packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetAddrPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getaddr packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetAddrPacket}
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

module.exports = GetAddrPacket;
