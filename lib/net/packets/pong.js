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
 * Pong Packet
 * @extends Packet
 * @property {BN} nonce
 */

class PongPacket extends Packet {
  /**
   * Create a `pong` packet.
   * @constructor
   * @param {BN?} nonce
   */

  constructor(nonce) {
    super();

    this.cmd = 'pong';
    this.type = Types.typesByIndex.PONG;

    this.nonce = nonce || common.ZERO_NONCE;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 8;
  }

  /**
   * Serialize pong packet to writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeBytes(this.nonce);
    return bw;
  }

  /**
   * Serialize pong packet.
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
    this.nonce = br.readBytes(8);
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
   * Instantiate pong packet from buffer reader.
   * @param {BufferReader} br
   * @returns {VerackPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate pong packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {VerackPacket}
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

module.exports = PongPacket;
