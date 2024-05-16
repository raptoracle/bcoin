/*!
 * packet.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

/**
 * @module net/packets
 */

const DUMMY = Buffer.alloc(0);


/**
 * Base Packet
 */

class Packet {
  /**
   * Create a base packet.
   * @constructor
   */

  constructor() {
    this.type = -1;
    this.cmd = '';
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 0;
  }

  /**
   * Serialize packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    return bw;
  }

  /**
   * Serialize packet.
   * @returns {Buffer}
   */

  toRaw() {
    return DUMMY;
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br
   */

  fromReader(br) {
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this;
  }
}

/*
 * Expose
 */

module.exports = Packet;
