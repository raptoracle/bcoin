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
const {consensus} = require('../../protocol/params');

/**
 * GetCFilters Packet
 * @extends Packet
 * @property {Number} startHeight
 * @property {Hash} stopHash
 * @property {Number} filterType
 */

class GetCFiltersPacket extends Packet {
  /**
   * Create a `getcfilters` packet.
   * @param {Number} filterType - Filter type.
   * @param {Number} startHeight - Start block height.
   * @param {Hash} stopHash - Stop block hash.
   */

  constructor(filterType, startHeight, stopHash) {
    super();

    this.cmd = 'getcfilters';
    this.type = Types.typesByIndex.GETCFILTERS;

    this.startHeight = startHeight || 0;
    this.stopHash = stopHash || consensus.ZERO_HASH;
    this.filterType = filterType;
  }

  /**
   * Get serialization size.
   * @returns {number} Size.
   */

  getSize() {
    return 37;
  }

  /**
   * Serialize getcfilters packet to writer.
   * @param {BufferWriter} bw - Serialization buffer.
   * @returns {BufferWriter} - Serialization buffer.
   */

  toWriter(bw) {
    bw.writeU8(this.filterType);
    bw.writeU32(this.startHeight);
    bw.writeHash(this.stopHash);

    return bw;
  };

  /**
   * Serialize getcfilters packet.
   * @returns {Buffer} - Serialized packet.
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br Serialization buffer.
   * @returns {GetCFiltersPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.startHeight = br.readU32();
    this.stopHash = br.readHash();

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data Serialized data.
   * @returns {GetCFiltersPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate getcfilters packet from buffer reader.
   * @param {BufferReader} br Serialization buffer.
   * @returns {GetCFiltersPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getcfilters packet from serialized data.
   * @param {Buffer} data Serialized data.
   * @returns {GetCFiltersPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = GetCFiltersPacket;
