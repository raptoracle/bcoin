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
const util = require('../../utils/util');
const NetAddress = require('../netaddress');
const {encoding} = bio;

/**
 * Version Packet
 * @extends Packet
 * @property {Number} version - Protocol version.
 * @property {Number} services - Service bits.
 * @property {Number} time - Timestamp of discovery.
 * @property {NetAddress} local - Our address.
 * @property {NetAddress} remote - Their address.
 * @property {Buffer} nonce
 * @property {String} agent - User agent string.
 * @property {Number} height - Chain height.
 * @property {Boolean} noRelay - Whether transactions
 * should be relayed immediately.
 */

class VersionPacket extends Packet {
  /**
   * Create a version packet.
   * @constructor
   * @param {Object?} options
   * @param {Number} options.version - Protocol version.
   * @param {Number} options.services - Service bits.
   * @param {Number} options.time - Timestamp of discovery.
   * @param {NetAddress} options.local - Our address.
   * @param {NetAddress} options.remote - Their address.
   * @param {Buffer} options.nonce
   * @param {String} options.agent - User agent string.
   * @param {Number} options.height - Chain height.
   * @param {Boolean} options.noRelay - Whether transactions
   * should be relayed immediately.
   */

  constructor(options) {
    super();

    this.cmd = 'version';
    this.type = Types.typesByIndex.VERSION;

    this.version = common.PROTOCOL_VERSION;
    this.services = common.LOCAL_SERVICES;
    this.time = util.now();
    this.remote = new NetAddress();
    this.local = new NetAddress();
    this.nonce = common.ZERO_NONCE;
    this.agent = common.USER_AGENT;
    this.height = 0;
    this.noRelay = false;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    if (options.version != null)
      this.version = options.version;

    if (options.services != null)
      this.services = options.services;

    if (options.time != null)
      this.time = options.time;

    if (options.remote)
      this.remote.fromOptions(options.remote);

    if (options.local)
      this.local.fromOptions(options.local);

    if (options.nonce)
      this.nonce = options.nonce;

    if (options.agent)
      this.agent = options.agent;

    if (options.height != null)
      this.height = options.height;

    if (options.noRelay != null)
      this.noRelay = options.noRelay;

    return this;
  }

  /**
   * Instantiate version packet from options.
   * @param {Object} options
   * @returns {VersionPacket}
   */

  static fromOptions(options) {
    return new this().fromOptions(options);
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += 20;
    size += this.remote.getSize(false);
    size += this.local.getSize(false);
    size += 8;
    size += encoding.sizeVarString(this.agent, 'ascii');
    size += 5;
    return size;
  }

  /**
   * Write version packet to buffer writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    bw.writeI32(this.version);
    bw.writeU32(this.services);
    bw.writeU32(0);
    bw.writeI64(this.time);
    this.remote.toWriter(bw, false);
    this.local.toWriter(bw, false);
    bw.writeBytes(this.nonce);
    bw.writeVarString(this.agent, 'ascii');
    bw.writeI32(this.height);
    bw.writeU8(this.noRelay ? 0 : 1);
    return bw;
  }

  /**
   * Serialize version packet.
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
    this.version = br.readI32();
    this.services = br.readU32();

    // Note: hi service bits
    // are currently unused.
    br.readU32();

    this.time = br.readI64();
    this.remote.fromReader(br, false);

    if (br.left() > 0) {
      this.local.fromReader(br, false);
      this.nonce = br.readBytes(8);
    }

    if (br.left() > 0)
      this.agent = br.readVarString('ascii', 256);

    if (br.left() > 0)
      this.height = br.readI32();

    if (br.left() > 0)
      this.noRelay = br.readU8() === 0;

    if (this.version === 10300)
      this.version = 300;

    assert(this.version >= 0, 'Version is negative.');
    assert(this.time >= 0, 'Timestamp is negative.');

    // No idea why so many peers do this.
    if (this.height < 0)
      this.height = 0;

    return this;
  }

  /**
   * Instantiate version packet from buffer reader.
   * @param {BufferReader} br
   * @returns {VersionPacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
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
   * Instantiate version packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {VersionPacket}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data, enc);
  }
}
/*
 * Expose
 */

module.exports = VersionPacket;
