/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const InvPacket = require('./inv');
const Types = require('./types');
const InvItem = require('../../primitives/invitem');

/**
 * GetData Packet
 * @extends InvPacket
 */

class GetDataPacket extends InvPacket {
  /**
   * Create a `getdata` packet.
   * @constructor
   * @param {(InvItem[])?} items
   */

  constructor(items) {
    super(items);
    this.cmd = 'getdata';
    this.type = Types.typesByIndex.GETDATA;
  }

  /**
   * Instantiate getdata packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetDataPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getdata packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetDataPacket}
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

module.exports = GetDataPacket;
