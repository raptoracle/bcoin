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
const consensus = require('../../protocol/consensus');
const {encoding} = bio;

/**
 * GetBlocks Packet
 * @extends Packet
 * @property {Hash[]} locator
 * @property {Hash|null} stop
 */

class GetBlocksPacket extends Packet {
  /**
   * Create a `getblocks` packet.
   * @constructor
   * @param {Hash[]} locator
   * @param {Hash?} stop
   */

  constructor(locator, stop) {
    super();

    this.cmd = 'getblocks';
    this.type = Types.typesByIndex.GETBLOCKS;

    this.version = common.PROTOCOL_VERSION;
    this.locator = locator || [];
    this.stop = stop || null;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += 4;
    size += encoding.sizeVarint(this.locator.length);
    size += 32 * this.locator.length;
    size += 32;
    return size;
  }

  /**
   * Serialize getblocks packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    assert(this.locator.length <= common.MAX_INV, 'Too many block hashes.');

    bw.writeU32(this.version);
    bw.writeVarint(this.locator.length);

    for (const hash of this.locator)
      bw.writeHash(hash);

    bw.writeHash(this.stop || consensus.ZERO_HASH);

    return bw;
  }

  /**
   * Serialize getblocks packet.
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
   */

  fromReader(br) {
    this.version = br.readU32();

    const count = br.readVarint();

    assert(count <= common.MAX_INV, 'Too many block hashes.');

    for (let i = 0; i < count; i++)
      this.locator.push(br.readHash());

    this.stop = br.readHash();

    if (this.stop.equals(consensus.ZERO_HASH))
      this.stop = null;

    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate getblocks packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {GetBlocksPacket}
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

module.exports = GetBlocksPacket;
