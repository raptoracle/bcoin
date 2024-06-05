/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const constants = require('../../blockchain/params/common');
const assert = require('bsert');
const bio = require('bufio');
const {inspectSymbol} = require('../../utils');
const utils = require('../../utils/util');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * AssetUpTxPayload
 * Represents a coinbase payload.
 * @alias module:primitives.Payload.AssetUpTxPayload
 * @extends AbstractPayload
 */

class AssetUpTxPayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
    this.updatable = 1;
    this.externalPayoutAddress = "0000000000000000000000000000000000000000";
    this.externalTxid = constants.NULL_HASH;
    this.externalConfirmations = 0;
    this.collateralAddress = 0;
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
    this.referenceHash = options.referenceHash;
    this.fee = options.fee;
    this.type = options.type;

    var scriptTargetAddress = Address.fromString(
      options.targetAddress
    );
    this.targetAddress = Script.buildPublicKeyHashOut(scriptTargetAddress).getData().toString("hex");

    var scriptOwnerAddress = Address.fromString(
      options.ownerAddress
    );
    this.ownerAddress = Script.buildPublicKeyHashOut(scriptOwnerAddress).getData().toString("hex");

    this.issueFrequency = options.issueFrequency;
    this.amount = options.amount * 1e8;
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
    return new AssetUpTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {AssetUpTxPayload}
   */
  fromBuffer(rawPayload) {

    var payloadBufferReader = new BufferReader(rawPayload);
    var payload = new AssetUpTxPayload();

    payload.version = payloadBufferReader.readUInt16LE();
    payload.assetId = payloadBufferReader        
        .read(HASH_SIZE)
        .reverse()
        .toString('hex');
    payload.updatable = payloadBufferReader.readUInt8();
    var referenceHash = payloadBufferReader.readVarintNum();
    payload.referenceHash = payloadBufferReader.read(referenceHash).toString();
    payload.fee = payloadBufferReader.readUInt16LE();
    payload.type = payloadBufferReader.readUInt8();
    payload.targetAddress = payloadBufferReader.read(PUBKEY_ID_SIZE).toString('hex');
    payload.issueFrequency = payloadBufferReader.readUInt8();
    payload.amount = payloadBufferReader.readUInt64LEBN().toNumber();
    payload.ownerAddress = payloadBufferReader.read(PUBKEY_ID_SIZE).toString('hex');
    payload.collateralAddress = payloadBufferReader.readUInt8();
    payload.exChainType = payloadBufferReader.readUInt16LE();
    payload.externalPayoutAddress = payloadBufferReader.read(PUBKEY_ID_SIZE).toString('hex');
    payload.externalTxid = payloadBufferReader
        .read(HASH_SIZE)
        .reverse()
        .toString('hex');
    payload.externalConfirmations = payloadBufferReader.readUInt16LE();
    payload.inputsHash = payloadBufferReader
        .read(HASH_SIZE)
        .reverse()
        .toString('hex');

    if (!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  }

  /**
  * Create new instance of payload from JSON
  * @param {string|AssetUpTxPayloadJSON} payloadJson
  * @return {AssetUpTxPayload}
  */
  fromJSON(payloadJson) {
    var payload = new AssetUpTxPayload(payloadJson);
    payload.validate();
    return payload;
  }

  /* Instance methods */

  /**
  * Validate payload
  * @return {boolean}
  */
  validate() {
    /*Preconditions.checkArgument(
      utils.isUnsignedInteger(this.version),
      'Expect version to be an unsigned integer'
    );*/
    /*
    Preconditions.checkArgument(
      utils.isHexaString(this.externalPayoutAddress),
      'Expect externalPayoutAddress to be a hex string'
    );
    */
    /*
    Preconditions.checkArgument(
      utils.isSha256HexString(this.externalTxid),
      'Expect externalTxid to be a hex string representing sha256 hash'
    );
    */
    /*Preconditions.checkArgumentType(
      this.externalConfirmations,
      'number',
      'externalConfirmations'
    );*/
    /*Preconditions.checkArgument(
      utils.isHexaString(this.inputsHash),
      'Expect inputsHash to be a hex string'
    );*/
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {AssetUpTxPayloadJSON}
   */
  toJSON(options) {
    var network = options && options.network;
    this.validate();
    var payloadJSON = {
        version: this.version,
        assetId: this.assetId,
        updatable: this.updatable,
        referenceHash: this.referenceHash,
        fee: this.fee,
        type: this.type,
        targetAddress: new Script(this.targetAddress)
            .toAddress(network)
            .toString(),
        ownerAddress: new Script(this.ownerAddress)
            .toAddress(network)
            .toString(),
        collateralAddress: this.collateralAddress,
        issueFrequency: this.issueFrequency,
        amount: this.amount,
        exChainType: this.exChainType,
        externalPayoutAddress: this.externalPayoutAddress,
        externalTxid: this.externalTxid,
        externalConfirmations: this.externalConfirmations,
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

    payloadBufferWriter.writeUInt16LE(this.version);
    payloadBufferWriter.write(Buffer.from(this.assetId, 'hex').reverse());
    payloadBufferWriter.writeUInt8(this.updatable);
    var referenceHash = Buffer.from(this.referenceHash, "utf8");
    payloadBufferWriter.writeVarintNum(referenceHash.length);
    payloadBufferWriter.write(referenceHash);
    payloadBufferWriter.writeUInt16LE(this.fee);
    payloadBufferWriter.writeUInt8(this.type);
    payloadBufferWriter.write(Buffer.from(this.targetAddress, 'hex'));
    payloadBufferWriter.writeUInt8(this.issueFrequency);
    payloadBufferWriter.writeUInt64LEBN(new BigNumber(this.amount));
    payloadBufferWriter.write(Buffer.from(this.ownerAddress, 'hex'));
    payloadBufferWriter.writeUInt8(this.collateralAddress); //collateralAddress not used
    payloadBufferWriter.writeUInt16LE(this.exChainType);
    payloadBufferWriter.write(Buffer.from(this.externalPayoutAddress, 'hex')); //externalPayoutAddress not used
    payloadBufferWriter.write(Buffer.from(this.externalTxid, 'hex').reverse());
    payloadBufferWriter.writeUInt16LE(this.externalConfirmations);
    payloadBufferWriter.write(Buffer.from(this.inputsHash, 'hex').reverse());

    return payloadBufferWriter.toBuffer();
  }

  copy() {
    return AssetUpTxPayload.fromBuffer(this.toBuffer());
  }
}

/*
 * Expose
 */

module.exports = AssetUpTxPayload;
