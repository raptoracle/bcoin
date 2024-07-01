/*!
 * assetcreatetxpayload.js - asset creation tx payload object for bcoin
 * Copyright (c) 2024, The raptoracle devs (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {NULL_HASH, PUBKEY_ID_SIZE} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
const BN = require('bcrypto/lib/bn');
const Script = require('../../script/script');
const Address = require('../address');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;
const NULL_ADDRESS = "0000000000000000000000000000000000000000";

const name_root_characters = new RegExp('^[A-Z0-9._]{3,}$');
const name_sub_characters = new RegExp('^[a-zA-Z0-9 ]{3,}$');
const rtm_names = new RegExp('^RTM$|^RAPTOREUM$|^wRTM$|^WRTM$|^RTMcoin$|^RTMCOIN$');

/**
 * // https://github.com/Raptor3um/raptoreum/blob/develop/src/assets/assets.cpp
 * @class AssetCreateTxPayload
 * Represents a asset creation payload.
 * @alias module:primitives.Payload.AssetCreateTxPayload
 * @extends AbstractPayload
 * @property {number} version	uint_16	Currently set to 1.
 * @property {string} name
 * @property {number} isUnique
 * @property {number} maxMintCount
 * @property {number} updatable
 * @property {number} decimalPoint
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

class AssetCreateTxPayload extends AbstractPayload {
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
    assert(options, 'Asset create payload data is required.');
    this.network = options && options.network;

    this.isRoot = options.isRoot;
    if(!this.isRoot) {
      this.assetName = options.rootName + '|' + options.assetName;
    } else {
      this.assetName = options.assetName;
    }
    this.rootId = options.rootId != null ? options.rootId : null;
    this.isUnique = options.isUnique;
    this.maxMintCount = options.maxMintCount;
    this.updatable = options.updatable;
    this.decimalPoint = options.decimalPoint;
    this.referenceHash = options.referenceHash;
    this.fee = options.fee;
    this.type = options.type;
    this.targetAddress = Address.fromString(options.targetAddress, this.network).toString();
    this.ownerAddress = Address.fromString(options.ownerAddress, this.network).toString();
    if(options.collateralAddress != null && options.collateralAddress != NULL_ADDRESS) {
      this.collateralAddress = Address.fromString(options.collateralAddress, this.network).toString();
    }
    if(options.externalPayoutScript != null) {
      this.externalPayoutScript = Script.fromAddress(options.externalPayoutScript).toJSON();
    }
    this.exChainType = options.exChainType != null ? options.exChainType : 0;
    this.externalTxid = options.externalTxid != null ? options.externalTxid : constants.NULL_HASH;
    this.externalConfirmations = options.externalConfirmations != null ? options.externalConfirmations : 0;
    this.issueFrequency = options.issueFrequency;
    this.amount = new BN(options.amount * 1e8);
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
    return new AssetCreateTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {AssetCreateTxPayload}
   */
  fromBuffer(rawPayload) {

    let payloadBufferReader = bio.read(rawPayload);
    const payload = new AssetCreateTxPayload();

    payload.version = payloadBufferReader.readU16();
    var assetName = payloadBufferReader.readVarint();
    payload.assetName = payloadBufferReader.readBytes(assetName).toString();
    payload.updatable = payloadBufferReader.readU8();
    payload.isUnique = payloadBufferReader.readU8();
    payload.maxMintCount = payloadBufferReader.readU16();
    payload.decimalPoint = payloadBufferReader.readU8();
    var referenceHash = payloadBufferReader.readVarint();
    payload.referenceHash = payloadBufferReader.readBytes(referenceHash).toString();
    payload.fee = payloadBufferReader.readU16();
    payload.type = payloadBufferReader.readU8();
    payload.targetAddress = payloadBufferReader.readBytes(PUBKEY_ID_SIZE).toString('hex');
    payload.issueFrequency = payloadBufferReader.readU8();
    payload.amount = new BN(payloadBufferReader.readBigU64()).toBigInt();
    payload.ownerAddress = payloadBufferReader.readBytes(PUBKEY_ID_SIZE).toString('hex');
    payload.collateralAddress = payloadBufferReader.readBytes(PUBKEY_ID_SIZE).toString('hex');
    payload.isRoot = payloadBufferReader.readU8();
    if(!payload.isRoot) {
      var rootIdSize = payloadBufferReader.readVarint();
      payload.rootId = payloadBufferReader        
        .readBytes(rootIdSize)
        .toString('utf8');
        var payloadSigSize = payloadBufferReader.readVarint();
      payload.payloadSig = payloadBufferReader
        .readBytes(payloadSigSize)
        .toString('hex');
    }
    payload.exChainType = payloadBufferReader.readU16();
    var scriptPayoutSize = payloadBufferReader.readVarint();
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

    if (!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse payload: raw payload is bigger than expected.'
      );
    }
  
    return payload;
  }

  /**
  * Create new instance of payload from JSON
  * @param {string|AssetCreateTxPayloadJSON} payloadJson
  * @return {AssetCreateTxPayload}
  */
  fromJSON(payloadJson) {
    const payload = new AssetCreateTxPayload(payloadJson);
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
    assert(fixed.isUnsignedInteger(this.isRoot), 'Expect isRoot to be an unsigned integer');
    if(this.isRoot) {
      assert(isAssetNameValid(this.assetName, this.isRoot),
        'Invalid assetName, ensure string parameters match criteria'
      );
    }
    assert(fixed.isUnsignedInteger(this.isUnique), 'Expect isUnique to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.updatable), 'Expect updatable to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.maxMintCount), 'Expect maxMintCount to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.decimalPoint) && this.decimalPoint <= 8, 'Expect decimalpoint to be an unsigned integer in range 0-8');
    assert(this.referenceHash.length <= 128, 'Expect referenceHash to be lte 128');
    assert(fixed.isUnsignedInteger(this.fee), 'Expect fee to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.type), 'Expect type to be an unsigned integer');
    assert(util.isHexaString(this.targetAddress), 'Expect targetAddress to be a hex string');
    assert(util.isHexaString(this.ownerAddress), 'Expect ownerAddress to be a hex string');
    assert(fixed.isUnsignedInteger(this.issueFrequency), 'Expect issueFrequency to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.amount), 'Expect amount to be an unsigned integer');
    assert(util.isHexaString(this.inputsHash), 'Expect inputsHash to be a hex string');
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.network] - network for address serialization
   * @return {AssetCreateTxPayloadJSON}
   */
  toJSON(options) {
    const skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
    const network = options && options.network;

    this.validate();

    let payloadJSON = {
      version: this.version,
      assetName: this.assetName,
      isUnique: this.isUnique,
      maxMintCount: this.maxMintCount,
      updatable: this.updatable,
      decimalPoint: this.decimalPoint,
      referenceHash: this.referenceHash,
      isRoot: this.isRoot,
      fee: this.fee,
      type: this.isRoot ? "root" : "sub",
      distributionType: getDistributionType(this.type),
      targetAddress: this.targetAddress,
      ownerAddress: this.ownerAddress,
      collateralAddress: this.collateralAddress !== NULL_ADDRESS 
        ? this.collateralAddress
        : "N/A",
      issueFrequency: this.issueFrequency,
      amount: new BN(this.amount).idivn(1e8),
      exChainType: this.exChainType,
      externalPayoutScript: this.externalPayoutScript !== "" ? this.externalPayoutScript : "N/A",
      externalTxid: this.externalTxid,
      externalConfirmations: this.externalConfirmations,
      inputsHash: this.inputsHash,
    };

    if (!this.isRoot) {
      payloadJSON.rootId = this.rootId;
      if (!skipSignature) {
        payloadJSON.payloadSig = this.payloadSig;
      }
    }
  
    return payloadJSON;
  }

  /**
   * Serialize payload to buffer
   * @param [options]
   * @return {Buffer}
   */
  toBuffer(options) {
    const skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
  
    this.validate();
  
    const payloadBufferWriter = bio.write();

    payloadBufferWriter.writeU16(this.version);
    const assetName = Buffer.from(this.assetName, "utf8");
    payloadBufferWriter.writeVarint(assetName.length);
    payloadBufferWriter.writeBytes(assetName);
    payloadBufferWriter.writeU8(this.updatable);
    payloadBufferWriter.writeU8(this.isUnique);
    payloadBufferWriter.writeU16(this.maxMintCount);
    payloadBufferWriter.writeU8(this.decimalPoint);
    const referenceHash = Buffer.from(this.referenceHash, "utf8");
    payloadBufferWriter.writeVarint(referenceHash.length);
    payloadBufferWriter.writeBytes(referenceHash);
    payloadBufferWriter.writeU16(this.fee);
    payloadBufferWriter.writeU8(this.type);
    payloadBufferWriter.writeBytes(Buffer.from(this.targetAddress, 'hex'));
    payloadBufferWriter.writeU8(this.issueFrequency);
    payloadBufferWriter.writeBigU64(new BN(this.amount).toBigInt());
    payloadBufferWriter.writeBytes(Buffer.from(this.ownerAddress, 'hex'));
    payloadBufferWriter.writeBytes(Buffer.from(this.collateralAddress, 'hex'));
    payloadBufferWriter.writeU8(this.isRoot);
    if(!this.isRoot) {
      const rootIdBuf = Buffer.from(this.rootId, 'utf8');
      payloadBufferWriter.writeVarint(rootIdBuf.length);
      payloadBufferWriter.writeBytes(rootIdBuf);
      if (!skipSignature) {
        var signatureBuf = Buffer.from(this.payloadSig, 'hex');
        payloadBufferWriter.writeVarint(signatureBuf.length);
        payloadBufferWriter.writeBytes(signatureBuf);
      }
    }
    payloadBufferWriter.writeU16(this.exChainType);
    const externalPayoutScriptBuf = Buffer.from(this.externalPayoutScript, 'hex');
    payloadBufferWriter.writeVarint(externalPayoutScriptBuf.length);
    payloadBufferWriter.writeBytes(Buffer.from(externalPayoutScriptBuf));
    payloadBufferWriter.writeHash(Buffer.from(this.externalTxid, 'hex').reverse());
    payloadBufferWriter.writeU16(this.externalConfirmations);
    payloadBufferWriter.writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    return payloadBufferWriter.toBuffer();
  }

  copy() {
    return AssetCreateTxPayload.fromBuffer(this.toBuffer());
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

function isAssetNameValid(name, isRoot) {
  if (name.length < 3 || name.length > 128) return false;
  if(isRoot)
    return name_root_characters.test(name) && !rtm_names.test(name);
  else
    return name_sub_characters.test(name) && !rtm_names.test(name);
}

/*
 * Expose
 */

module.exports = AssetCreateTxPayload;
