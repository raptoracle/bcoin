/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const bio = require('bufio');
const consensus = require('../../blockchain/params/consensus');

/**
 * GetCFHeaders Packet
 * @extends Packet
 * @property {Number} filterType
 * @property {Number} startHeight
 * @property {Hash} stopHash
 */

class GetCFHeadersPacket extends Packet {
  /**
   * Create a `getcfheaders` packet.
   * @constructor
   * @param {Number} filterType - Filter type.
   * @param {Number} startHeight - Start block height.
   * @param {Hash} stopHash - Stop block hash.
   */

  constructor(filterType, startHeight, stopHash) {
    super();

    this.cmd = 'getcfheaders';
    this.type = Types.typesByIndex.GETCFHEADERS;

    this.filterType = filterType;
    this.startHeight = startHeight || 0;
    this.stopHash = stopHash || consensus.ZERO_HASH;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 37;
  }

  /**
   * Serialize getcfheaders packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeU8(this.filterType);
    bw.writeU32(this.startHeight);
    bw.writeHash(this.stopHash);

    return bw;
  }

  /**
   * Serialize getcfheaders packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   * @returns {GetCFHeadersPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.startHeight = br.readU32();
    this.stopHash = br.readHash();

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   * @returns {GetCFHeadersPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate getcfheaders packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetCFHeadersPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getcfheaders packet from serialized data.
   * @param {Buffer} data
   * @returns {GetCFHeadersPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = GetCFHeadersPacket;
