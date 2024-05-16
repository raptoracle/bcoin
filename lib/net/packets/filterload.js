/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Packet = require('./packet');
const Types = require('./types');
const {BloomFilter} = require('bfilter');

/**
 * FilterLoad Packet
 * @extends Packet
 */

class FilterLoadPacket extends Packet {
  /**
   * Create a `filterload` packet.
   * @constructor
   * @param {BloomFilter|null} filter
   */

  constructor(filter) {
    super();

    this.cmd = 'filterload';
    this.type = Types.typesByIndex.FILTERLOAD;

    this.filter = filter || new BloomFilter();
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return this.filter.getSize();
  }

  /**
   * Serialize filterload packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return this.filter.toWriter(bw);
  }

  /**
   * Serialize filterload packet.
   * @returns {Buffer}
   */

  toRaw() {
    return this.filter.toRaw();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.filter.fromReader(br);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    this.filter.fromRaw(data);
    return this;
  }

  /**
   * Instantiate filterload packet from buffer reader.
   * @param {BufferReader} br
   * @returns {FilterLoadPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate filterload packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {FilterLoadPacket}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }

  /**
   * Ensure the filter is within the size limits.
   * @returns {Boolean}
   */

  isWithinConstraints() {
    return this.filter.isWithinConstraints();
  }
}

/*
 * Expose
 */

module.exports = FilterLoadPacket;
