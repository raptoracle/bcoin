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
const consesus = require('../../protocol/consensus');

/**
 * create a cfcheckpt packet.
 * @extends Packet
 * @property {Number} filterType
 * @property {Hash} stopHash
 * @property {Hash[]} filterHeaders
 */

class CFCheckptPacket extends Packet {
  /**
   * Create a `cfcheckpt` packet.
   * @constructor
   * @param {Number} filterType - Filter type.
   * @param {Hash?} stopHash - Stop block hash.
   * @param {Hash[]} filterHeaders - Filter headers.
   */

  constructor(filterType, stopHash, filterHeaders) {
    super();

    this.cmd = 'cfcheckpt';
    this.type = Types.typesByIndex.CFCHECKPT;

    this.filterType = filterType;
    this.stopHash = stopHash || consesus.ZERO_HASH;
    this.filterHeaders = filterHeaders || [];
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 33;
    size += encoding.sizeVarint(this.filterHeaders.length);
    size += this.filterHeaders.length * 32;
    return size;
  }

  /**
   * Serialize cfcheckpt packet to writer.
   * @param {BufferWriter} bw
   * @returns {BufferWriter}
   */

  toWriter(bw) {
    bw.writeU8(this.filterType);
    bw.writeHash(this.stopHash);
    bw.writeVarint(this.filterHeaders.length);

    for (const hash of this.filterHeaders)
      bw.writeHash(hash);

    return bw;
  }

  /**
   * Serialize cfcheckpt packet.
   * @returns {Buffer}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br
   * @returns {CFCheckptPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.stopHash = br.readHash();
    const length = br.readVarint();

    for (let i = 0; i < length; i++)
      this.filterHeaders.push(br.readHash());

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data
   * @returns {CFCheckptPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate cfcheckpt packet from buffer reader.
   * @param {BufferReader} br
   * @returns {CFCheckptPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate cfcheckpt packet from serialized data.
   * @param {Buffer} data
   * @returns {CFCheckptPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = CFCheckptPacket;
