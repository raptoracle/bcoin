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
const common = require('../common');

/**
 * Spork Packet
 * @extends Packet
 * @property {BN} nonce
 */

class SporkPacket extends Packet {
  /**
   * Create a `spork` packet.
   * @constructor
   */

  constructor(id, value, timeSigned, sig) {
    super();

    this.cmd = 'spork';
    this.type = Types.typesByIndex.SPORK;

    this.id = id || 0;
    this.value = value || 0;
    this.timeSigned = timeSigned || 0;
    this.sig = sig || null;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 86;
  }

  /**
   * Serialize spork packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeU32(this.id);
    bw.writeU64(this.value);
    bw.writeU64(this.timeSigned);
    bw.writeVarBytes(this.sig);
    return bw;
  }

  /**
   * Serialize spork packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.toWriter(bio.write(86)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.id = br.readU32();
    this.value = br.readU64();
    this.timeSigned = br.readU64();
    this.sig = br.readVarBytes();
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
   * Instantiate spork packet from buffer reader.
   * @param {BufferReader} br
   * @returns {SporkPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate spork packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {SporkPacket}
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

module.exports = SporkPacket;
