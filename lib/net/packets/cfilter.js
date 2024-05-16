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
const {encoding} = bio;

/**
 * GetCFilter Packet
 * @extends Packet
 * @property {Number?} filterType
 * @property {Hash?} blockHash
 * @property {Buffer?} filterBytes
 */

class CFilterPacket extends Packet {
  /**
   * Create a `cfilter` packet.
   * @constructor
   * @param filterType
   * @param blockHash
   * @param filterBytes
   */

  constructor(filterType, blockHash, filterBytes) {
    super();

    this.cmd = 'cfilter';
    this.type = Types.typesByIndex.CFILTER;

    this.filterType = filterType;
    this.blockHash = blockHash || null;
    this.filterBytes = filterBytes || null;
  }

  /**
   * Get serialization size.
   * @returns {number} Size.
   */

  getSize() {
    let size = 33;
    size += encoding.sizeVarBytes(this.filterBytes);
    return size;
  }

  /**
   * Serialize cfilter packet to writer.
   * @param {BufferWriter} bw - Serialization buffer.
   * @returns {BufferWriter} - Serialization buffer.
   */

  toWriter(bw) {
    bw.writeU8(this.filterType);
    bw.writeHash(this.blockHash);
    bw.writeVarBytes(this.filterBytes);

    return bw;
  }

  /**
   * Serialize cfilter packet.
   * @returns {Buffer} - Serialized packet.
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Instantiate cfilter packet from buffer reader.
   * @param {BufferReader} br
   * @returns {CFilterPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.blockHash = br.readHash();
    this.filterBytes = br.readVarBytes();

    return this;
  }

  /**
   * Instantiate cfilter packet from serialized data.
   * @param {Buffer} data
   * @returns {CFilterPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate cfilter packet from buffer reader.
   * @param {BufferReader} br
   * @returns {CFilterPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate cfilter packet from serialized data.
   * @param {Buffer} data
   * @returns {CFilterPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = CFilterPacket;
