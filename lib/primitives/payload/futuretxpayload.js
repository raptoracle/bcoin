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
const {NULL_HASH} = require('../../protocol/params/common');
const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @typedef {Object} FutureTxPayloadJSON
 * @property {number} message version	uint16_t. Currently set to 1. 
 * @property {number} maturity - number of confirmations to be matured and spendable.
 * @property {number} lockTime - number of seconds for this transaction to be spendable
 * @property {number} lockOutputIndex - vout index that is locked in this transaction
 * @property {number} fee - fee was paid for this future in addition to miner fee. it is a whole non-decimal point value.
 * @property {number} updatableByDestination - 1 to allow some information of this transaction to be change by lockOutput address
 * @property {number} exChainType external chain type. each 15 bit unsign number will be map to a external chain. i.e 0 for btc
 * @property {string} externalPayoutAddress
 * @property {string} externalTxid
 * @property {number} externalConfirmations
 * @property {string} inputsHash - replay protection
 */

/**
 * @class FutureTxPayload
 * @property {number} version	uint_16	Currently set to 1.
 * @property {number} maturity
 * @property {number} lockTime.
 * @property {number} lockOutputIndex
 * @property {number} fee
 * @property {number} updatableByDestination
 * @property {number} exChainType
 * @property {string} externalPayoutAddress
 * @property {string} externalTxid
 * @property {number} externalConfirmations
 * @property {string} inputsHash
 */

class FutureTxPayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
    this.updatableByDestination = 0;
    this.exChainType = 0;
    this.externalPayoutAddress = "N/A";
    this.externalTxid = NULL_HASH;
    this.externalConfirmations = 0;
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
    this.maturity = options.maturity;
    this.lockTime = options.lockTime;
    this.lockOutputIndex = options.lockOutputIndex;
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
    return new FutureTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {FutureTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    let payload = new FutureTxPayload();

    payload.version = payloadBufferReader.readU16();
    payload.maturity = payloadBufferReader.readI32();
    payload.lockTime = payloadBufferReader.readI32();
    payload.lockOutputIndex = payloadBufferReader.readU16();
    payload.fee = payloadBufferReader.readU16();
    payload.updatableByDestination = payloadBufferReader.readU8();
    payload.exChainType = payloadBufferReader.readU16();
    payload.externalPayoutAddress = payloadBufferReader.readU8();
    payload.externalTxid = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.externalConfirmations = payloadBufferReader.readU16();
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');

    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse future payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  }

  /**
   * Create new instance of payload from JSON
   * @param {string|FutureTxPayloadJSON} payloadJson
   * @return {FutureTxPayload}
   */
  fromJSON(payloadJson) {
    var payload = new FutureTxPayload(payloadJson);
    payload.validate();
    return payload;
  }

  /* Instance methods */

  /**
   * Validate payload
   * @return {boolean}
   */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(typeof this.maturity === 'number', 'Expect maturity to be a number');
    assert(typeof this.lockTime === 'number', 'Expect lockTime to be a number');
    assert(fixed.isUnsignedInteger(this.lockOutputIndex), 'Expect lockOutputIndex to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.fee), 'Expect fee to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.updatableByDestination), 'Expect updatableByDestination to be integer');
    assert(fixed.isUnsignedInteger(this.exChainType), 'Expect exChainType to be an unsigned integer');
    //assert(util.isHexaString(this.externalPayoutAddress), 'Expect externalPayoutAddress to be a hex string');
    //assert(util.isSha256HexString(this.externalTxid), 'Expect externalTxid to be a hex string representing sha256 hash');
    //assert(fixed.isUnsignedInteger(this.externalConfirmations), 'Expect externalConfirmations to be an unsigned integer');
    assert(util.isSha256HexString(this.inputsHash), 'Expect inputsHash to be a hex string representing sha256 hash');
    return true;
  };

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {FutureTxPayloadJSON}
   */
  toJSON(options) {
    //var network = options && options.network;
    this.validate();
    var payloadJSON = {
      version: this.version,
      maturity: this.maturity,
      lockTime: this.lockTime,
      lockOutputIndex: this.lockOutputIndex,
      fee: this.fee,
      updatableByDestination: this.updatableByDestination === 1,
      exChainType: this.exChainType,
      //externalPayoutAddress: new Script(this.scriptPayout).toAddress(network).toString(),
      externalPayoutAddress: this.externalPayoutAddress,
      externalTxid: this.externalTxid,
      externalConfirmations: this.externalConfirmations,
      inputsHash: this.inputsHash,
    };

    return payloadJSON;
  };

  /**
   * Serialize payload to buffer
   * @param [options]
   * @return {Buffer}
   */
  toBuffer(options) {
    this.validate();

    var payloadBufferWriter = bio.write();

    //var isExternalPayoutAddressHex = utils.isHexaString(this.externalPayoutAddress) ? Buffer.from(this.externalPayoutAddress, "hex").reverse() : Buffer.from(this.externalPayoutAddress, "utf-8");

    payloadBufferWriter
      .writeU16(this.version)
      .writeI32(this.maturity)
      .writeI32(this.lockTime)
      .writeU16(this.lockOutputIndex)
      .writeU16(this.fee)
      .writeU8(this.updatableByDestination)
      .writeU16(this.exChainType)
      //.write(Buffer.from(this.externalPayoutAddress, "utf-8"))
      .writeU8(0) //externalPayoutAddress not used
      .writeHash(Buffer.from(this.externalTxid, 'hex').reverse())
      .writeU16(this.externalConfirmations)
      .writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    return payloadBufferWriter.render();
  };

  copy() {
    return FutureTxPayload.fromBuffer(this.toBuffer());
  };

}

/*
 * Expose
 */

module.exports = FutureTxPayload;
