/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {
  BLS_SIGNATURE_SIZE, 
  EMPTY_SIGNATURE_SIZE, 
} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * ProUpRevTxPayload
 * Represents a ProUpRevTxPayload
 * 
 * 
 */

/**
 * @typedef {Object} ProUpRevTransactionPayloadJSON
 * @property {number} version
 * @property {string} proTxHash
 * @property {number} reason
 * @property {string} inputsHash
 * @property {string} payloadSig
 */

/**
 * @class ProUpRevTxPayload
 * @alias module:primitives.Payload.ProUpRevTxPayload
 * @extends AbstractPayload
 * @property {number} version uint_16	2	ProUpRevTx version number. Currently set to 1.
 * @property {string} proTxHash uint256	32	The hash of the provider transaction
 * @property {number} reason uint_16	2	The reason for revoking the key.
 * @property {string} inputsHash uint256	32	Hash of all the outpoints of the transaction inputs
 * @property {string} payloadSig BLSSig Signature of the hash of the ProTx fields. Signed by the Operator.
 */

class ProUpRevTxPayload extends AbstractPayload {
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
    assert(options, 'Payload data is required.');
    this.proTxHash = options.proTxHash;
    this.reason = options.reason;
    this.inputsHash = options.inputsHash;
    this.payloadSigSize = options.payloadSigSize;

    if (options.payloadSig) {
      this.payloadSig = options.payloadSig;
    }

    this.validate();
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
    return new ProUpRevTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Serializes ProUpRevTxPayload payload
   * @param {ProUpRevTransactionPayloadJSON} transitionPayloadJSON
   * @return {Buffer} serialized payload
   */
  serializeJSONToBuffer(transitionPayloadJSON) {
    var payloadBufferWriter = bio.write();

    payloadBufferWriter
      .writeU16(transitionPayloadJSON.version)
      .writeHash(Buffer.from(transitionPayloadJSON.proTxHash, 'hex').reverse())
      .writeU16(transitionPayloadJSON.reason)
      .writeHash(Buffer.from(transitionPayloadJSON.inputsHash, 'hex'));

    if (transitionPayloadJSON.payloadSig) {
      var signatureBuf = Buffer.from(transitionPayloadJSON.payloadSig, 'hex');
      payloadBufferWriter.writeBytes(signatureBuf);
    } else {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    }

    return payloadBufferWriter.render();
  }

  /**
   * Parses raw ProUpRevTxPayload payload
   * @param {Buffer} rawPayloadBuffer
   * @return {ProUpRevTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    var payload = new ProUpRevTxPayload();
    payload.version = payloadBufferReader.readU16();
    payload.proTxHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.reason = payloadBufferReader.readU16();
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.payloadSig = payloadBufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
      .toString('hex');

      if(!payloadBufferReader.finished()) {
        throw new Error(
          'Failed to parse prouprev payload: raw payload is bigger than expected.'
        );
      }

    payload.validate();

    return payload;
  }

  /**
   * Creates new instance of ProUpRevTxPayload payload from JSON
   * @param {string|ProUpRevTransactionPayloadJSON} payloadJSON
   * @return {ProUpRevTxPayload}
   */
  fromJSON(payloadJSON) {
    return new ProUpRevTxPayload(payloadJSON);
  }

  /* Instance methods */

  /**
   * Validates ProUpRevTxPayload payload data
   * @return {boolean}
   */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.reason), 'Expect reason to be an unsigned integer');
    assert(util.isSha256HexString(this.proTxHash), 'expected proTxHash to be a sha256 hex string');
    assert(util.isSha256HexString(this.inputsHash), 'expected inputsHash to be a sha256 hex string');
    if (this.payloadSig) {
      assert(util.isHexaString(this.payloadSig), 'expected payloadSig to be a hex string');
      assert(this.payloadSig.length === BLS_SIGNATURE_SIZE * 2, 'Invalid payloadSig size');
    }

    return true;
  }

  /**
   * Serializes ProUpRevTxPayload payload to JSON
   * @param [options]
   * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
   * @return {ProUpRevTransactionPayloadJSON}
   */
  toJSON(options) {
    var skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
    var payloadJSON = {
      version: this.version,
      proTxHash: this.proTxHash,
      reason: this.reason,
      inputsHash: this.inputsHash,
    };
    if (!skipSignature) {
      payloadJSON.payloadSig = this.payloadSig;
    }
    return payloadJSON;
  }

  /**
   * Serializes ProUpRevTxPayload to buffer
   * @param [options]
   * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
   * @return {Buffer}
   */
  toBuffer(options) {
    this.validate();
    var skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);

      var payloadBufferWriter = bio.write();

    payloadBufferWriter
      .writeU16(this.version)
      .writeHash(Buffer.from(this.proTxHash, 'hex').reverse())
      .writeU16(this.reason)
      .writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    if (!skipSignature) {
      var signatureBuf = Buffer.from(this.payloadSig, 'hex');
      payloadBufferWriter.writeVarBytes(signatureBuf);
    } else {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    }

    return payloadBufferWriter.render();
  }

  /**
   * Copy payload instance
   * @return {ProUpRevTxPayload}
   */
  copy() {
    return ProUpRevTxPayload.fromJSON(this.toJSON());
  }

}

/*
 * Expose
 */

module.exports = ProUpRevTxPayload;
