/*!
 * getsporks.js - spork packets for bcoin
 * Copyright (c) 2024, the Raptoracle developers (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');

/**
 * GetSporks Packet
 * @extends Packet
 */

class GetSporksPacket extends Packet {
  /**
   * Create a `getsporks` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'getsporks';
    this.type = Types.typesByIndex.GETSPORKS;
  }

  /**
   * Instantiate getsporks packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetSporksPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getsporks packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetSporksPacket}
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

module.exports = GetSporksPacket;
