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
const DUMMY = Buffer.alloc(0);

/**
 * FilterAdd Packet
 * @extends Packet
 * @property {Buffer} data
 */

class FilterAddPacket extends Packet {
  /**
   * Create a `filteradd` packet.
   * @constructor
   * @param {Buffer?} data
   */

  constructor(data) {
    super();

    this.cmd = 'filteradd';
    this.type = Types.typesByIndex.FILTERADD;

    this.data = data || DUMMY;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return encoding.sizeVarBytes(this.data);
  }

  /**
   * Serialize filteradd packet to writer.
   * @returns {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeVarBytes(this.data);
    return bw;
  }

  /**
   * Serialize filteradd packet.
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
    this.data = br.readVarBytes();
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
   * Instantiate filteradd packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {FilterAddPacket}
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

module.exports = FilterAddPacket;
