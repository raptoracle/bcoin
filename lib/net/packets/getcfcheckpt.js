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
 * create a getcfcheckpt packet.
 * @extends Packet
 * @property {Number} filterType
 * @property {Hash} stopHash
 */

class GetCFCheckptPacket extends Packet {
  /**
   * Create a `getCFCheckptPacket` packet.
   * @constructor
   * @param {Number} filterType - Filter type.
   * @param {Hash?} stopHash - Stop block hash.
   */
  constructor(filterType, stopHash) {
    super();

    this.cmd = 'getcfcheckpt';
    this.type = Types.typesByIndex.GETCFCHECKPT;

    this.filterType = filterType;
    this.stopHash = stopHash || consensus.ZERO_HASH;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 33;
  }

  /**
   * Serialize getcfcheckpt packet to writer.
   * @param {BufferWriter} bw
   * @returns {BufferWriter}
   */

  toWriter(bw) {
    bw.writeU8(this.filterType);
    bw.writeHash(this.stopHash);

    return bw;
  }

  /**
   * Serialize getcfcheckpt packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br
   * @returns {GetCFCheckptPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.stopHash = br.readHash();

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data
   * @returns {GetCFCheckptPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate getcfcheckpt packet from buffer reader.
   * @param {BufferReader} br
   * @returns {GetCFCheckptPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate getcfcheckpt packet from serialized data.
   * @param {Buffer} data
   * @returns {GetCFCheckptPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = GetCFCheckptPacket;
