/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const assert = require('bsert');
const bio = require('bufio');
const common = require('../common');
const {consensus} = require('../../protocol/params');
const {encoding} = bio;

/**
 * CFHeaders Packet
 * @extends Packet
 * @property {Number} filterType
 * @property {Hash?} stopHash
 * @property {Hash} previousFilterHeader
 * @property {(Hash[])?} filterHashes
 */

class CFHeadersPacket extends Packet {
  /**
   * Create a `cfheaders` packet.
   * @constructor
   * @param {Number} filterType
   * @param {Hash?} stopHash
   * @param {Hash} previousFilterHeader
   * @param {(Hash[])?} filterHashes
   */

  constructor(filterType, stopHash, previousFilterHeader, filterHashes) {
    super();

    this.cmd = 'cfheaders';
    this.type = Types.typesByIndex.CFHEADERS;

    this.filterType = filterType;
    this.stopHash = stopHash || consesus.ZERO_HASH;
    this.previousFilterHeader = previousFilterHeader || consensus.ZERO_HASH;
    this.filterHashes = filterHashes || [];
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 65;
    size += encoding.sizeVarint(this.filterHashes.length);
    size += this.filterHashes.length * 32;
    return size;
  }

  /**
   * Serialize cfheaders packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    assert(this.filterHashes.length <= common.MAX_CFHEADERS);
    bw.writeU8(this.filterType);
    bw.writeHash(this.stopHash);
    bw.writeHash(this.previousFilterHeader);
    bw.writeVarint(this.filterHashes.length);

    for (const hash of this.filterHashes)
      bw.writeHash(hash);

    return bw;
  }

  /**
   * Serialize cfheaders packet.
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
   * @returns {CFHeadersPacket}
   */

  fromReader(br) {
    this.filterType = br.readU8();
    this.stopHash = br.readHash();
    this.previousFilterHeader = br.readHash();
    const filterHashesLength = br.readVarint();

    assert(filterHashesLength <= common.MAX_CFHEADERS,
      'filterHashesLength must be less than 2000');

    for (let i = 0; i < filterHashesLength; i++)
      this.filterHashes.push(br.readHash());
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   * @returns {CFHeadersPacket}
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate cfheaders packet from buffer reader.
   * @param {BufferReader} br
   * @returns {CFHeadersPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate cfheaders packet from serialized data.
   * @param {Buffer} data
   * @returns {CFHeadersPacket}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = CFHeadersPacket;
