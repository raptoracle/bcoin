/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {BLS_SIGNATURE_SIZE} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @class AssetMintTxPayload
 * Represents an asset mint payload.
 * @alias module:primitives.Payload.AssetMintTxPayload
 * @extends AbstractPayload
 * @property {number} version	uint_16	Currently set to 1.
 * @property {string} assetId
 * @property {number} fee - fee was paid for this mint in addition to miner fee. it is a whole non-decimal point value.
 * @property {string} inputsHash - replay protection
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
    assert(options, 'Asset mint data is required.');
    this.assetId = options.assetId;
    this.fee = options.fee;
    this.inputsHash = options.inputsHash;
    if (options.payloadSig) {
      this.payloadSig = options.payloadSig;
    }
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
    const payloadBufferReader = bio.read(rawPayload);
    const payload = new AssetMintTxPayload();
  
    payload.version = payloadBufferReader.readU16();
    const assetId = payloadBufferReader.readVarint();
    payload.assetId = payloadBufferReader        
      .readBytes(assetId)
      .toString('utf8');
    payload.fee = payloadBufferReader.readU16();
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.payloadSig = payloadBufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
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
    const payload = new AssetMintTxPayload(payloadJson);
    payload.validate();
    return payload;
  };

  /* Instance methods */

  /**
   * Validate payload
   * @return {boolean}
   */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(util.isHexaString(this.assetId), 'Expect assetId to be a hex string');
    assert(fixed.isUnsignedInteger(this.fee), 'Expect fee to be an unsigned integer');
    assert(util.isHexaString(this.inputsHash), 'Expect inputsHash to be a hex string');
    if (this.payloadSig) {
      assert(util.isHexaString(this.payloadSig), 'Expected payloadSig to be a hex string');
    }
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {AssetMintTxPayloadJSON}
   */
  toJSON(options) {
    const skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);

    this.validate();

    let payloadJSON = {
      version: this.version,
      assetId: this.assetId,
      fee: this.fee,
      inputsHash: this.inputsHash,
    };

    if (!skipSignature) {
      payloadJSON.payloadSig = this.payloadSig;
    }

    return payloadJSON;
  }

  /**
   * Serialize payload to buffer
   * @param [options]
   * @return {Buffer}
   */
  toBuffer(options) {
    this.validate();
    const skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
  
    const payloadBufferWriter = bio.write();
  
    payloadBufferWriter.writeU16(this.version);
    const assetId = Buffer.from(this.assetId, 'utf8');
    payloadBufferWriter.writeVarint(assetId.length);
    payloadBufferWriter.writeBytes(assetId);
    payloadBufferWriter.writeU16(this.fee);
    payloadBufferWriter.writeHash(Buffer.from(this.inputsHash, 'hex').reverse());
    if (!skipSignature) {
      const signatureBuf = Buffer.from(this.payloadSig, 'hex');
      payloadBufferWriter.writeBytes(signatureBuf);
    }
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
