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

/**
 * FeeFilter Packet
 * @extends Packet
 * @property {Rate} rate
 */

class FeeFilterPacket extends Packet {
  /**
   * Create a `feefilter` packet.
   * @constructor
   * @param {Rate?} rate
   */

  constructor(rate) {
    super();

    this.cmd = 'feefilter';
    this.type = Types.typesByIndex.FEEFILTER;

    this.rate = rate || 0;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 8;
  }

  /**
   * Serialize feefilter packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeI64(this.rate);
    return bw;
  }

  /**
   * Serialize feefilter packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.toWriter(bio.write(8)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.rate = br.readI64();
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
   * Instantiate feefilter packet from buffer reader.
   * @param {BufferReader} br
   * @returns {FeeFilterPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate feefilter packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {FeeFilterPacket}
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

module.exports = FeeFilterPacket;
