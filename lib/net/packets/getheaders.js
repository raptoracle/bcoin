/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const GetBlocksPacket = require('./getblocks');
const Types = require('./types');

/**
 * GetHeader Packets
 * @extends GetBlocksPacket
 */

class GetHeadersPacket extends GetBlocksPacket {
  /**
   * Create a `getheaders` packet.
   * @constructor
   * @param {Hash[]} locator
   * @param {Hash?} stop
   */

  constructor(locator, stop) {
    super(locator, stop);
    this.cmd = 'getheaders';
    this.type = Types.typesByIndex.GETHEADERS;
  }

  /**
   * Instantiate getheaders packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetHeadersPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getheaders packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetHeadersPacket}
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

module.exports = GetHeadersPacket;
