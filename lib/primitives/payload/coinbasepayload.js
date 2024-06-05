/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const assert = require('bsert');
const bio = require('bufio');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const {SHA256_HASH_SIZE} = require('../../blockchain/params/common');
const CURRENT_PAYLOAD_VERSION = 2;

/**
 * @typedef {Object} CoinbasePayloadJSON
 * @property {number} version
 * @property {number} height
 * @property {string} merkleRootMNList
 * @property {string} merkleRootQuorums
 */

/**
 * @class CoinbasePayload
 * @alias module:primitives.Payload.Coinbase
 * @extends AbstractPayload
 * @property {number} version
 * @property {number} height
 * @property {string} merkleRootMNList
 * @property {string} merkleRootQuorums
 */

class CoinbasePayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
  }

  /**
   * Parse raw transition payload
   * @param {Buffer} rawPayload
   * @return {CoinbasePayload}
   */

  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    let payload = new CoinbasePayload();
    payload.version = payloadBufferReader.readU16();
    payload.height = payloadBufferReader.readU32();
    payload.merkleRootMNList = payloadBufferReader.readHash().reverse().toString('hex');
    if (payload.version >= 2) {
      payload.merkleRootQuorums = payloadBufferReader.readHash().reverse().toString('hex');
    }

    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse coinbase payload: raw payload is bigger than expected.'
      );
    }

    payload.validate();
    return payload;
  }

  /**
   * Create new instance of payload from JSON
   * @param {string|CoinbasePayloadJSON} payloadJson
   * @return {CoinbasePayload}
   */

  fromJSON(payloadJson) {
    var payload = new CoinbasePayload();
    payload.version = payloadJson.version;
    payload.height = payloadJson.height;
    payload.merkleRootMNList = payloadJson.merkleRootMNList;
    if (payload.version >= 2) {
      payload.merkleRootQuorums = payloadJson.merkleRootQuorums;
    }
  
    payload.validate();
    return payload;
  }

  /* Instance methods */

  /**
   * Validates payload data
   * @return {boolean}
   */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.height), 'Expect height to be an unsigned integer');
    assert(util.isHexaString(this.merkleRootMNList), 'expect merkleRootMNList to be a hex string but got ' + 
      typeof this.merkleRootMNList);
    assert(this.merkleRootMNList.length === SHA256_HASH_SIZE * 2, 'Invalid merkleRootMNList size');
    if (this.version >= 2) {
      assert(util.isHexaString(this.merkleRootQuorums), 'expect merkleRootQuorums to be a hex string but got ' + 
        typeof this.merkleRootQuorums);
      assert(this.merkleRootQuorums.length === SHA256_HASH_SIZE * 2, 'Invalid merkleRootQuorums size');
    }
    return true;
  }

  /**
   * Serializes payload to JSON
   * @return {CoinbasePayloadJSON}
   */
  toJSON() {
    this.validate();
    var json = {
      version: this.version,
      height: this.height,
      merkleRootMNList: this.merkleRootMNList,
    };
    if (this.version >= 2) {
      json.merkleRootQuorums = this.merkleRootQuorums;
    }
    return json;
  }

  /**
   * Serialize payload to buffer
   * @return {Buffer}
   */
  toBuffer() {
    this.validate();
    var payloadBufferWriter = bio.write();

    payloadBufferWriter
      .writeU16(this.version)
      .writeU32(this.height)
      .writeHash(Buffer.from(this.merkleRootMNList, 'hex').reverse());

    if (this.version >= 2) {
      payloadBufferWriter.writeHash(Buffer.from(this.merkleRootQuorums, 'hex').reverse());
    }

    return payloadBufferWriter.render();
  }

  /**
   * Copy payload instance
   * @return {CoinbasePayload}
   */
  copy() {
    return CoinbasePayload.fromJSON(this.toJSON());
  }
}

/*
 * Expose
 */

module.exports = CoinbasePayload;
