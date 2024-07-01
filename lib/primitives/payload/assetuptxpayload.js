/*!
 * assetuptxpayload.js - asset update tx payload object for bcoin
 * Copyright (c) 2024, The raptoracle devs (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {BLS_SIGNATURE_SIZE, NULL_HASH, PUBKEY_ID_SIZE} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
const BN = require('bcrypto/lib/bn');
const Script = require('../../script/script');
const Address = require('../address');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * // https://github.com/Raptor3um/raptoreum/blob/develop/src/assets/assets.cpp
 * @class AssetUpTxPayload
 * Represents an asset update payload.
 * @alias module:primitives.Payload.AssetUpTxPayload
 * @extends AbstractPayload
 * @property {number} version	uint_16	Currently set to 1.
 * @property {string} assetId
 * @property {number} updatable
 * @property {string} referenceHash
 * @property {number} fee
 * @property {number} type
 * @property {string} targetAddress
 * @property {string} ownerAddress
 * @property {string} collateralAddress
 * @property {string} issueFrequency
 * @property {string} amount
 * @property {number} exChainType
 * @property {string} externalPayoutAddress
 * @property {string} externalTxid
 * @property {number} externalConfirmations
 * @property {string} inputsHash
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
    this.externalTxid = NULL_HASH;
    this.externalConfirmations = 0;
    this.collateralAddress = Buffer.alloc(PUBKEY_ID_SIZE).toString("hex");
    this.externalPayoutScript = Buffer.alloc(0).toString("hex");
    
    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  parseOptions(options) {
    assert(options, 'Asset update payload data is required.');
    this.network = options && options.network;

    this.assetId = options.assetId;
    this.maxMintCount = options.maxMintCount;
    this.updatable = options.updatable;
    this.referenceHash = options.referenceHash;
    this.fee = options.fee;
    this.type = options.type;
    this.assetName = options.assetName;
    this.targetAddress = Address.fromString(options.targetAddress, this.network).toString();
    this.ownerAddress = Address.fromString(options.ownerAddress, this.network).toString();
    if(options.collateralAddress != null && options.collateralAddress != NULL_ADDRESS) {
      this.collateralAddress = Address.fromString(options.collateralAddress, this.network).toString();
    }
    if(options.externalPayoutScript != null) {
      this.externalPayoutScript = Script.fromAddress(options.externalPayoutScript).toJSON();
    }
    this.exChainType = options.exChainType != null ? options.exChainType : 0;
    this.externalTxid = options.externalTxid != null ? options.externalTxid : NULL_HASH;
    this.externalConfirmations = options.externalConfirmations != null ? options.externalConfirmations : 0;
    this.issueFrequency = options.issueFrequency;
    this.amount = new BN(options.amount * 1e8);
    this.inputsHash = options.inputsHash;
    if (options.payloadSig) {
      this.payloadSig = options.payloadSig;
    }
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
    const payloadBufferReader = bio.read(rawPayload);
    const payload = new AssetUpTxPayload();

    payload.version = payloadBufferReader.readU16();
    const assetId = payloadBufferReader.readVarint();
    payload.assetId = payloadBufferReader        
      .readBytes(assetId)
      .toString('utf8');
    payload.updatable = payloadBufferReader.readU8();
    const referenceHash = payloadBufferReader.readVarint();
    payload.referenceHash = payloadBufferReader.readBytes(referenceHash).toString('utf8');
    payload.fee = payloadBufferReader.readU16();
    payload.type = payloadBufferReader.readU8();
    payload.targetAddress = payloadBufferReader
      .readBytes(PUBKEY_ID_SIZE)
      .toString('hex');
    payload.issueFrequency = payloadBufferReader.readU8();
    payload.maxMintCount = payloadBufferReader.readU16();
    payload.amount = new BN(payloadBufferReader.readBigU64()).toBigInt();
    payload.ownerAddress = payloadBufferReader.readBytes(PUBKEY_ID_SIZE).toString('hex');
    payload.collateralAddress = payloadBufferReader.readBytes(PUBKEY_ID_SIZE).toString('hex');
    payload.exChainType = payloadBufferReader.readU16();
    const scriptPayoutSize = payloadBufferReader.readVarint();
    payload.externalPayoutScript = payloadBufferReader
      .readBytes(scriptPayoutSize)
      .toString('hex');
    payload.externalTxid = payloadBufferReader
        .readHash()
        .reverse()
        .toString('hex');
    payload.externalConfirmations = payloadBufferReader.readU16();
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
  }

  /**
  * Create new instance of payload from JSON
  * @param {string|AssetUpTxPayloadJSON} payloadJson
  * @return {AssetUpTxPayload}
  */
  fromJSON(payloadJson) {
    return new AssetUpTxPayload(payloadJson);
  }

  /* Instance methods */

  /**
  * Validate payload
  * @return {boolean}
  */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.updatable), 'Expect updatable to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.maxMintCount), 'Expect maxMintCount to be an unsigned integer');
    assert(this.referenceHash.length <= 128, 'Expect referenceHash to be lte 128');
    assert(fixed.isUnsignedInteger(this.fee), 'Expect fee to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.type), 'Expect type to be an unsigned integer');
    assert(util.isHexaString(this.targetAddress), 'Expect targetAddress to be a hex string');
    assert(this.targetAddress.length === PUBKEY_ID_SIZE * 2, 'Expect targetAddress to be 20 bytes in size');
    assert(util.isHexaString(this.ownerAddress), 'Expect ownerAddress to be a hex string');
    assert(this.ownerAddress.length === PUBKEY_ID_SIZE * 2, 'Expect ownerAddress to be 20 bytes in size');
    assert(fixed.isUnsignedInteger(this.issueFrequency), 'Expect issueFrequency to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.amount), 'Expect type to be an amount integer');
    assert(util.isHexaString(this.inputsHash), 'Expect inputsHash to be a hex string');
    if (this.payloadSig) {
      assert(util.isHexaString(this.payloadSig), 'Expected payloadSig to be a hex string.');
    }
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {AssetUpTxPayloadJSON}
   */
  toJSON(options) {
    const skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
    const network = options && options.network;

    this.validate();

    let payloadJSON = {
        version: this.version,
        assetId: this.assetId,
        updatable: this.updatable,
        referenceHash: this.referenceHash,
        fee: this.fee,
        type: getDistributionType(this.type),
        targetAddress: this.targetAddress,
        issueFrequency: this.issueFrequency,
        maxMintCount: this.maxMintCount,
        amount: this.amount / 1e8,
        ownerAddress: this.ownerAddress,
        collateralAddress: this.collateralAddress,
        exChainType: this.exChainType,
        externalPayoutScript: this.externalPayoutScript,
        externalTxid: this.externalTxid,
        externalConfirmations: this.externalConfirmations,
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
    payloadBufferWriter.writeU8(this.updatable);
    const referenceHash = Buffer.from(this.referenceHash, "utf8");
    payloadBufferWriter.writeVarint(referenceHash.length);
    payloadBufferWriter.writeBytes(referenceHash);
    payloadBufferWriter.writeU16(this.fee);
    payloadBufferWriter.writeU8(this.type);
    payloadBufferWriter.writeBytes(Buffer.from(this.targetAddress, 'hex'));
    payloadBufferWriter.writeU8(this.issueFrequency);
    payloadBufferWriter.writeU16(this.maxMintCount);
    payloadBufferWriter.writeUInt64LEBN(new BN(this.amount).toBigInt());
    payloadBufferWriter.writeBytes(Buffer.from(this.ownerAddress, 'hex'));
    payloadBufferWriter.writeBytes(Buffer.from(this.collateralAddress, 'hex'));
    payloadBufferWriter.writeU16(this.exChainType);
    payloadBufferWriter.writeVarint(Buffer.from(this.externalPayoutScript, 'hex').length);
    payloadBufferWriter.writeBytes(Buffer.from(this.externalPayoutScript, 'hex'));
    payloadBufferWriter.writeHash(Buffer.from(this.externalTxid, 'hex').reverse());
    payloadBufferWriter.writeU16(this.externalConfirmations);
    payloadBufferWriter.writeHash(Buffer.from(this.inputsHash, 'hex').reverse());
    if (!skipSignature) {
      const signatureBuf = Buffer.from(this.payloadSig, 'hex');
      payloadBufferWriter.writeBytes(signatureBuf);
    }
    return payloadBufferWriter.toBuffer();
  }

  copy() {
    return AssetUpTxPayload.fromBuffer(this.toBuffer());
  }
}

/*
 * Helpers
 */

function getDistributionType(t) {
  switch (t) {
      case 0:
          return "manual";
      case 1:
          return "coinbase";
      case 2:
          return "address";
      case 3:
          return "schedule";
  }
  return "invalid";
}

/*
 * Expose
 */

module.exports = AssetUpTxPayload;
