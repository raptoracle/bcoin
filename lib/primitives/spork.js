/*!
 * spork.js - spork object for bcoin
 * Copyright (c) 2024, the raptoracle devs (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';
const path = require('path');
const bdb = require('bdb');
const assert = require('bsert');
const fs = require('bfile');
const bio = require('bufio');
const Logger = require('blgr');
const hash256 = require('bcrypto/lib/hash256');
const Network = require('../protocol/network');
const TimeData = require('../protocol/timedata');
const util = require('../utils/util');

/**
 * SporkMessage
 * @alias module:primitives.SporkMessage
 * @constructor
 */

class SporkMessage {
  /**
   * Create a SporkMessage.
   * @constructor
   */

  constructor(packet) {
    this.time = new TimeData();
    this._raw = packet;

    this.id = packet.id || 0;
    this.value = packet.value || 0;
    this.timeSigned = packet.timeSigned || 0;
    this.sig = packet.sig || null;
  }

  hash() {
    return hash256.digest(this.toRaw()).toString('hex');
  }

  toJson() {
    return this.getJson();
  }

  getJson() {
    return {
      id: this.id,
      type: SporkMessage.typesByVal[this.id],
      value: this.value,
      timeSigned: this.timeSigned,
      sig: this.sig.toString('hex'),
      time: this.time.ms(),
      hash: this.hash(),
      raw: this.toRaw().toString('hex'),
    }
  }

  /**
   * get size of spork item
   * @return {Number}
   */

  getSize() {
    return 86;
  }

  /**
   * Write spork to buffer writer.
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
   * Serialize spork.
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
    this.sig = br.readVarBytes(this.sigLength);
    return this;
  }

  /**
   * Inject properties from serialized data.
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate spork from buffer reader.
   * @param {BufferReader} br
   * @returns {Spork}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate spork from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {Spork}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }

}

/**
 * Spork types.
 * @enum {Number}
 * @default
 */

SporkMessage.types = {
  SPORK_2_INSTANTSEND_ENABLED: 10001,
  SPORK_3_INSTANTSEND_BLOCK_FILTERING: 10002,
  SPORK_9_SUPERBLOCKS_ENABLED: 10008,
  SPORK_17_QUORUM_DKG_ENABLED: 10016,
  SPORK_19_CHAINLOCKS_ENABLED: 10018,
  SPORK_21_LOW_LLMQ_PARAMS: 10020,
  SPORK_22_SPECIAL_TX_FEE: 10021,
  SPORK_23_QUORUM_ALL_CONNECTED: 10023,
  SPORK_24_PS_MORE_PARTICIPANTS: 10024,
  SPORK_25_QUORUM_POSE: 10025,
  SPORK_INVALID: -1,
};

/**
 * Spork type defaults.
 * @enum {Number}
 * @default
 */

SporkMessage.defaults = {
  SPORK_2_INSTANTSEND_ENABLED: 4070908800,
  SPORK_3_INSTANTSEND_BLOCK_FILTERING: 4070908800,
  SPORK_9_SUPERBLOCKS_ENABLED: 4070908800,
  SPORK_17_QUORUM_DKG_ENABLED: 4070908800,
  SPORK_19_CHAINLOCKS_ENABLED: 4070908800,
  SPORK_21_LOW_LLMQ_PARAMS: 4070908800,
  SPORK_22_SPECIAL_TX_FEE: 4070908800,
  SPORK_23_QUORUM_ALL_CONNECTED: 4070908800,
  SPORK_24_PS_MORE_PARTICIPANTS: 4070908800,
  SPORK_25_QUORUM_POSE: 4070908800,
  SPORK_INVALID: -1,
};

/**
 * Spork types by value.
 * @const {Object}
 */

SporkMessage.typesByVal = {
  10001: 'SPORK_2_INSTANTSEND_ENABLED',
  10002: 'SPORK_3_INSTANTSEND_BLOCK_FILTERING',
  10008: 'SPORK_9_SUPERBLOCKS_ENABLED',
  10016: 'SPORK_17_QUORUM_DKG_ENABLED',
  10018: 'SPORK_19_CHAINLOCKS_ENABLED',
  10020: 'SPORK_21_LOW_LLMQ_PARAMS',
  10021: 'SPORK_22_SPECIAL_TX_FEE',
  10023: 'SPORK_23_QUORUM_ALL_CONNECTED',
  10024: 'SPORK_24_PS_MORE_PARTICIPANTS',
  10025: 'SPORK_25_QUORUM_POSE',
};

/*
 * Database Layout:
 *   V -> db version
 *   F[type] -> last file record by type
 *   f[type][fileno] -> file record by type and file number
 *   b[type][hash] -> block record by type and block hash
 */

const layout = {
  V: bdb.key('V'),
  F: bdb.key('F', ['uint32']),
  f: bdb.key('f', ['uint32', 'uint32']),
  b: bdb.key('b', ['uint32', 'hash256'])
};

class SporkManager {
  /**
   * Create a SporkManager.
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    this.time = new TimeData();
    this.network = Network.primary;
    this.logger = Logger.global;


    this.map = new Map();
    this.fresh = [];
    this.totalFresh = 0;

    this.sporks = [];
    this.timer = null;
    this.needsFlush = false;
    this.flushing = false;

    this.prefix = null;
    this.filename = null;
    this.flushInterval = 2 * 60 * 1000;

    this.options = this.fromOptions(options);

  }


  /**
   * Inject properties from options.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    assert(options, 'Options are required.');

    if (options.network != null) {
      this.network = Network.get(options.network);
    }

    if (options.logger != null) {
      assert(typeof options.logger === 'object');
      this.logger = options.logger;
    }

    if (options.memory != null) {
      assert(typeof options.memory === 'boolean');
      this.memory = options.memory;
    }

    if (options.prefix != null) {
      assert(typeof options.prefix === 'string');
      this.prefix = options.prefix;
      this.filename = path.join(this.prefix, 'sporks.json');
    }

    if (options.filename != null) {
      assert(typeof options.filename === 'string');
      this.filename = options.filename;
    }

    if (options.flushInterval != null) {
      assert(options.flushInterval >= 0);
      this.flushInterval = options.flushInterval;
    }

    return this;
  }


  process(packet) {
    //if (spork.timeSigned > this.time.ms())
    //this.logger.info('SPORK -- hash: %h id: %d value: %d bestHeight: %d peer=%s', sporkHash, packet.id, packet.value, this.chain.height, peer.hostname());
    const sporkMsg = new SporkMessage(packet);
    const spork = sporkMsg.getJson();

    this.add(spork);

    //this.sporks[spork.id].push(spork);
  }

/**
 * Open sporks and read spork file.
 * @method
 * @returns {Promise}
 */

  async open() {
    try {
      await this.loadFile();
    } catch (e) {
      this.logger.warning('Sporks deserialization failed.');
      this.logger.error(e);
    }

    if (this.size() === 0)
      this.injectSporks();

    this.start();
  }


  /**
   * Close hostlist.
   * @method
   * @returns {Promise}
   */

  async close() {
    this.stop();
    await this.flush();
    this.reset();
  }

  /**
   * Start flush interval.
   */

  start() {
    if (!this.filename)
      return;

    assert(this.timer == null);

    this.flush();

    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Stop flush interval.
   */

  stop() {
    if (!this.filename)
      return;

    assert(this.timer != null);
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Read and initialize from hosts file.
   * @method
   * @returns {Promise}
   */

  injectSporks() {
    const sporks = SporkMessage.defaults;

    for (const [spork, value] of Object.entries(sporks)) {
      if(value < 1)
        continue;
      const spk = {
        id: SporkMessage.types[spork],
        type: spork,
        value: value,
        timeSigned: 0,
        sig: null,
        time: 0,
        active: false,
      };

      this.add(spk);
    }
  }


  /**
   * Read and initialize from hosts file.
   * @method
   * @returns {Promise}
   */

  async loadFile() {
    const filename = this.filename;

    if (fs.unsupported)
      return;

    if (!filename)
      return;

    let data;
    try {
      data = await fs.readFile(filename, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT')
        return;
      throw e;
    }

    const json = JSON.parse(data);

    this.fromJSON(json);
  }

  /**
   * Flush addrs to hosts file.
   * @method
   * @returns {Promise}
   */

  async flush() {
    const filename = this.filename

    if (fs.unsupported)
      return;

    if (!filename)
      return;

    if (!this.needsFlush)
      return;

    if (this.flushing)
      return;

    this.needsFlush = false;

    this.logger.debug('Writing sporks to %s.', filename);

    const json = this.toJSON();
    const data = JSON.stringify(json, null, 4);

    this.flushing = true;

    try {
      await fs.writeFile(filename, data, 'utf8');
    } catch (e) {
      this.logger.warning('Writing sporks failed.');
      this.logger.error(e);
    }

    this.flushing = false;
  }

  /**
   * Get list size.
   * @returns {Number}
   */

  size() {
    return this.sporks.length;
  }


  /**
   * Reset host list.
   */

  reset() {
    this.map.clear();

    for (const bucket of this.fresh)
      bucket.clear();

    this.totalFresh = 0;

    this.sporks.length = 0;
  }

  add(spork) {
    assert(spork.id !== 0);
    let entry = this.map.get(spork.id);
    if(entry) {
      let interval = 24 * 60 * 60;
      // Online?
      const now = this.network.now();
      if (now - spork.time < 24 * 60 * 60)
        interval = 60 * 60;

      // Periodically update time.
      if (entry.time < spork.time - interval) {
        entry.time = spork.time;
        this.needsFlush = true;
      }

      // Do not update if no new
      // information is present.
      if (entry.time && spork.time <= entry.time)
        return false;

      entry.type = spork.type;
      entry.value = spork.value;
      entry.timeSigned = spork.timeSigned;
      entry.sig = spork.sig;
      entry.active = this.isActive(spork.id);
    } else {
      entry = spork;
    }

    this.map.set(entry.id, entry);
    this.needsFlush = true;

    return true;
  }

  isActive(sId) {
    
  }

  getValue(sId) {

  }

  getIdByName(sName) {

  }

  getNameById(sId) {

  }

  getByHash(sHash) {

  }

  /**
   * Convert host list to json-friendly object.
   * @returns {Object}
   */

  toJSON() {
    const sporks = [];

    for (const spork of this.map.values())
      sporks.push(spork);

    return {
      version: 1,
      network: this.network.type,
      sporks: sporks,
    };
  }

  /**
   * Inject properties from json object.
   * @private
   * @param {Object} json
   * @returns {HostList}
   */

  fromJSON(json) {
    const map = new Map();

    assert(json && typeof json === 'object');

    assert(!json.network || json.network === this.network.type,
      'Network mistmatch.');

    assert(json.version === 1,
      'Bad address serialization version.');

    assert(Array.isArray(json.sporks));

    for (const spork of json.sporks) {

      map.set(spork.id, spork);
    }

    this.map = map;

    return this;
  }

  /**
   * Instantiate host list from json object.
   * @param {Object} options
   * @param {Object} json
   * @returns {HostList}
   */

  static fromJSON(options, json) {
    return new this(options).fromJSON(json);
  }


}

/*
 * Expose
 */
module.exports = SporkManager;
