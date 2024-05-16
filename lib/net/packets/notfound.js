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
 * NotFound Packet
 * @extends InvPacket
 */

class NotFoundPacket extends InvPacket {
  /**
   * Create a `notfound` packet.
   * @constructor
   * @param {(InvItem[])?} items
   */

  constructor(items) {
    super(items);
    this.cmd = 'notfound';
    this.type = Types.typesByIndex.NOTFOUND;
  }

  /**
   * Instantiate notfound packet from buffer reader.
   * @param {BufferReader} br
   * @returns {NotFoundPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate notfound packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {NotFoundPacket}
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

module.exports = NotFoundPacket;
