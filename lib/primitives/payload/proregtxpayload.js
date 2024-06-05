/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {
  BLS_PUBLIC_KEY_SIZE, 
  BLS_SIGNATURE_SIZE, 
  EMPTY_SIGNATURE_SIZE, 
  PUBKEY_ID_SIZE, 
} = require('../../blockchain/params/common');
const assert = require('bsert');
const bio = require('bufio');
const Script = require('../../script/script');
const Address = require('../address');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');
const ipUtils = require('../../utils/ip');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @typedef {Object} ProRegTxPayloadJSON
 * @property {number} version	uint_16	2	Provider transaction version number. Currently set to 1.
 * @property {string} collateralHash
 * @property {number} collateralIndex	uint_32	4	The collateral index.
 * @property {string} service - service address, ip and port
 * @property {string} keyIDOwner	CKeyID	20	The public key hash used for owner related signing (ProTx updates, governance voting)
 * @property {string} pubKeyOperator	BLSPubKey	48	The public key used for operational related signing (network messages, ProTx updates)
 * @property {string} keyIDVoting	CKeyID	20	The public key hash used for voting.
 * @property {number} operatorReward	uint_16	2	A value from 0 to 10000.
 * @property {string} payoutAddress
 * @property {string} inputsHash	uint256	32	Hash of all the outpoints of the transaction inputs
 * @property {number} [payloadSigSize] Size of the Signature
 * @property {string} [payloadSig] Signature of the hash of the ProTx fields. Signed with keyIDOwner
 */

/**
 * @class ProRegTxPayload
 * @alias module:primitives.Payload.ProRegTxPayload
 * @extends AbstractPayload
 * @property {number} version	uint_16	2	Provider transaction version number. Currently set to 1.
 * @property {number} type
 * @property {number} mode
 * @property {string} collateralHash
 * @property {number} collateralIndex	uint_32	4	The collateral index.
 * @property {string} service - service address, ip and port
 * @property {string} keyIDOwner	CKeyID	20	The public key hash used for owner related signing (ProTx updates, governance voting)
 * @property {string} pubKeyOperator	BLSPubKey	48	The public key used for operational related signing (network messages, ProTx updates)
 * @property {string} keyIDVoting	CKeyID	20	The public key hash used for voting.
 * @property {number} operatorReward	uint_16	2	A value from 0 to 10000.
 * @property {string} scriptPayout	Script	Variable	Payee script (p2pkh/p2sh)
 * @property {string} inputsHash	uint256	32	Hash of all the outpoints of the transaction inputs
 * @property {number} [payloadSigSize] Size of the Signature
 * @property {string} [payloadSig] Signature of the hash of the ProTx fields. Signed with keyIDOwner
 */

class ProRegTxPayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
    this.mode = 0; // only 0 supported for now
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
    this.type = options.type;
    this.mode = options.mode;
    this.collateralHash = options.collateralHash;
    this.collateralIndex = options.collateralIndex;
    this.service = options.service;
    this.keyIDOwner = options.keyIDOwner;
    this.pubKeyOperator = options.pubKeyOperator;
    this.keyIDVoting = options.keyIDVoting;
    this.operatorReward = options.operatorReward;
    this.scriptPayout = Script.fromAddress(options.payoutAddress).toString();
    this.inputsHash = options.inputsHash;
    this.payloadSig = options.payloadSig;
    this.payloadSigSize = this.payloadSig
      ? Buffer.from(this.payloadSig, 'hex').length
      : 0;
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
    return new ProRegTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {ProRegTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    let payload = new ProRegTxPayload();

    payload.version = payloadBufferReader.readU16();
    payload.type = payloadBufferReader.readU16();
    payload.mode = payloadBufferReader.readU16();
    payload.collateralHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.collateralIndex = payloadBufferReader.readU32();
    payload.service = ipUtils.bufferToIPAndPort(
      payloadBufferReader.readBytes(ipUtils.IP_AND_PORT_SIZE)
    );

    payload.keyIDOwner = payloadBufferReader
      .readBytes(PUBKEY_ID_SIZE)
      .reverse()
      .toString('hex');
    payload.pubKeyOperator = payloadBufferReader
      .readBytes(BLS_PUBLIC_KEY_SIZE)
      .toString('hex');
    payload.keyIDVoting = payloadBufferReader
      .readBytes(PUBKEY_ID_SIZE)
      .reverse()
      .toString('hex');

    payload.operatorReward = payloadBufferReader.readU16();
    var scriptPayoutSize = payloadBufferReader.readVarint();
    payload.scriptPayout = payloadBufferReader
      .readBytes(scriptPayoutSize)
      .toString('hex');
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.payloadSigSize = payloadBufferReader.readVarint();
    if (payload.payloadSigSize > 0) {
      payload.payloadSig = payloadBufferReader
        .readBytes(payload.payloadSigSize)
        .toString('hex');
    }
    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse proreg payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  }

  /**
   * Create new instance of payload from JSON
   * @param {string|ProRegTxPayloadJSON} payloadJson
   * @return {ProRegTxPayload}
   */
  fromJSON(payloadJson) {
    var payload = new ProRegTxPayload(payloadJson);
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
    assert(typeof this.collateralIndex === 'number', 'Expect collateralIndex to be a number');
    assert(util.isSha256HexString(this.collateralHash), 'Expect collateralHash to be a hex string representing sha256 hash');
    if (!ipUtils.isZeroAddress(this.service)) {
      assert(ipUtils.isIPV4(this.service), 'Expected service to be a string with ip address and port');
    }
    assert(util.isHexaString(this.keyIDOwner), 'Expect keyIDOwner to be a hex string');
    assert(util.isHexaString(this.pubKeyOperator), 'Expect pubKeyOperator to be a hex string');
    assert(util.isHexaString(this.keyIDVoting), 'Expect keyIDVoting to be a hex string');
    assert(this.keyIDOwner.length === PUBKEY_ID_SIZE * 2, 'Expect keyIDOwner to be 20 bytes in size ');
    assert(this.pubKeyOperator.length === BLS_PUBLIC_KEY_SIZE * 2, 'Expect keyIDOwner to be 48 bytes in size ');
    assert(this.keyIDVoting.length === PUBKEY_ID_SIZE * 2, 'Expect keyIDOwner to be 20 bytes in size ');
    assert(typeof this.operatorReward === 'number', 'Expect operatorReward to be a number');
    assert(this.operatorReward <= 10000, 'Expect operatorReward to be lesser than or equal 10000');
    assert(util.isHexaString(this.inputsHash), 'Expect inputsHash to be a hex string');
    if (this.scriptPayout) {
      let script = new Script().fromJSON(this.scriptPayout);
      assert(script.isPubkeyhash() || script.isScripthash(), 'Expected scriptPayout to be a p2pkh/p2sh');
    }

    if (Boolean(this.payloadSig)) {
      assert(typeof this.payloadSigSize === 'number', 'Expect payloadSigSize to be a number');
      assert(util.isHexaString(this.payloadSig), 'Expect payloadSig to be a hex string');
      assert(this.payloadSig.length * 2 !== BLS_SIGNATURE_SIZE, 'payloadSig size doesn\'t match BLS signature size');
    }
    return true;
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.skipSignature]
   * @param [options.network] - network for address serialization
   * @return {ProRegTxPayloadJSON}
   */
  toJSON(options) {
    var noSignature = !Boolean(this.payloadSig);
    var skipSignature = noSignature || (options && options.skipSignature);
    var network = options && options.network;
    let script = new Script().fromJSON(this.scriptPayout);
    this.validate();
    var payloadJSON = {
      version: this.version,
      type: this.type,
      mode: this.mode,
      collateralHash: this.collateralHash,
      collateralIndex: this.collateralIndex,
      service: this.service,
      keyIDOwner: this.keyIDOwner,
      pubKeyOperator: this.pubKeyOperator,
      keyIDVoting: this.keyIDVoting,
      operatorReward: this.operatorReward,
      payoutAddress: new Address().fromScript(script).toString(),
      inputsHash: this.inputsHash,
    };
    if (!skipSignature) {
      payloadJSON.payloadSigSize = this.payloadSigSize;
      payloadJSON.payloadSig = this.payloadSig;
    }
    return payloadJSON;
  }

  /**
   * Serialize payload to buffer
   * @param [options]
   * @param {Boolean} [options.skipSignature] - skip signature. Needed for signing
   * @return {Buffer}
   */
  toBuffer(options) {
    var noSignature = !Boolean(this.payloadSig);
    var skipSignature = noSignature || (options && options.skipSignature);
    this.validate();

    var payloadBufferWriter = bio.write();

    payloadBufferWriter
      .writeU16(this.version) // 2
      .writeU16(this.type) // 2
      .writeU16(this.mode) // 2
      .writeHash(Buffer.from(this.collateralHash, 'hex').reverse()) // 32
      .writeI32(this.collateralIndex) // 4
      .writeBytes(ipUtils.ipAndPortToBuffer(this.service))
      .writeBytes(Buffer.from(this.keyIDOwner, 'hex').reverse()) // 20
      .writeBytes(Buffer.from(this.pubKeyOperator, 'hex')) // 48
      .writeBytes(Buffer.from(this.keyIDVoting, 'hex').reverse()) // 20
      .writeU16(this.operatorReward) // 2
      .writeVarint(Buffer.from(this.scriptPayout, 'hex').length)
      .writeBytes(Buffer.from(this.scriptPayout, 'hex'))
      .writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    if (!skipSignature && this.payloadSig) {
      //payloadBufferWriter.writeVarint(
      //  Buffer.from(this.payloadSig, 'hex').length
      //);
      payloadBufferWriter.writeVarBytes(Buffer.from(this.payloadSig, 'hex'));
    } else {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    }

    return payloadBufferWriter.render();
  }

  copy() {
    return ProRegTxPayload.fromBuffer(this.toBuffer());
  }

}

/*
 * Expose
 */

module.exports = ProRegTxPayload;
