/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {SHA256_HASH_SIZE} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
const {inspectSymbol} = require('../../utils');
const utils = require('../../utils/util');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * CoinbasePayload
 * Represents a coinbase payload.
 * @alias module:primitives.Payload.AssetMintTxPayload
 * @extends AbstractPayload
 */

class AssetMintTxPayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  parseOptions(options) {
    assert(options, 'Block data is required.');
    this.assetId = options.assetId;
    this.fee = options.fee;
    this.inputsHash = options.inputsHash;
    return this;
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    this.parseOptions(options);

    return this;
  }

  /**
   * Instantiate block from options.
   * @param {Object} options
   * @returns {Block}
   */

  static fromOptions(options) {
    return new AssetMintTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {AssetMintTxPayload}
   */
  fromBuffer(rawPayload) {
    var payloadBufferReader = new BufferReader(rawPayload);
    var payload = new AssetMintTxPayload();

    payload.version = payloadBufferReader.readUInt16LE();
    payload.assetId = payloadBufferReader
      .read(SHA256_HASH_SIZE)
      .reverse()
      .toString('hex');
    payload.fee = payloadBufferReader.readUInt16LE();
    payload.inputsHash = payloadBufferReader
      .read(SHA256_HASH_SIZE)
      .reverse()
      .toString('hex');

    if (!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  };

  /**
   * Create new instance of payload from JSON
   * @param {string|AssetMintTxPayloadJSON} payloadJson
   * @return {AssetMintTxPayload}
   */
  fromJSON(payloadJson) {
    var payload = new AssetMintTxPayload(payloadJson);
    payload.validate();
    return payload;
  };

  /* Instance methods */

  /**
   * Validate payload
   * @return {boolean}
   */
  validate() {
    Preconditions.checkArgument(
      utils.isUnsignedInteger(this.version),
      'Expect version to be an unsigned integer'
    );
    Preconditions.checkArgument(
      utils.isHexaString(this.assetId),
      'Expect assetId to be a hex string'
    );
    Preconditions.checkArgumentType(
      this.fee,
      'number',
      'fee'
    );
    Preconditions.checkArgument(
      utils.isHexaString(this.inputsHash),
      'Expect inputsHash to be a hex string'
    );
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {AssetMintTxPayloadJSON}
   */
  toJSON(options) {
    //var network = options && options.network;
    this.validate();
    var payloadJSON = {
      version: this.version,
      assetId: this.assetId,
      fee: this.fee,
      inputsHash: this.inputsHash,
    };

    return payloadJSON;
  }

  /**
   * Serialize payload to buffer
   * @param [options]
   * @return {Buffer}
   */
  toBuffer(options) {
    this.validate();

    var payloadBufferWriter = new BufferWriter();

    payloadBufferWriter
      .writeUInt16LE(this.version)
      .write(Buffer.from(this.assetId, 'hex').reverse())
      .writeUInt16LE(this.fee)
      .write(Buffer.from(this.inputsHash, 'hex').reverse());

    return payloadBufferWriter.toBuffer();
  }

  copy() {
    return AssetMintTxPayload.fromBuffer(this.toBuffer());
  }
}

/*
 * Expose
 */

module.exports = AssetMintTxPayload;
