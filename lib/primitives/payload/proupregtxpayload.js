/*!
 * proupregtxpayload.js - proupreg tx payload object for bcoin
 * Copyright (c) 2024, the raptoracle devs (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {
  BLS_PUBLIC_KEY_SIZE, 
  BLS_SIGNATURE_SIZE, 
  EMPTY_SIGNATURE_SIZE, 
  PUBKEY_ID_SIZE,
} = require('../../protocol/params/common');
const assert = require('bsert');
const bio = require('bufio');
const Script = require('../../script/script');
const Address = require('../address');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @typedef {Object} ProUpRegTransactionPayloadJSON
 * @property {number} version
 * @property {string} proTxHash
 * @property {string} pubKeyOperator
 * @property {string} keyIDVoting
 * @property {string} payoutAddress
 * @property {string} inputsHash
 * @property {string} [payloadSig]
 */

/**
 * @class ProUpRegTxPayload
 * @alias module:primitives.Payload.ProUpRegTxPayload
 * @extends AbstractPayload
 * @property {number} version uint_16	2	Upgrade Provider Transaction version number. Currently set to 1.
 * @property {string} proTxHash uint256	32	The hash of the provider transaction
 * @property {number} mode uint_16	2	Masternode mode
 * @property {string} pubKeyOperator BLSPubKey	48	The public key hash used for operational related signing (network messages, ProTx updates)
 * @property {string} keyIDVoting CKeyID	20	The public key hash used for voting.
 * @property {number} scriptPayoutSize compactSize uint	1-9	Size of the Payee Script.
 * @property {string} scriptPayout Script	Variable	Payee script (p2pkh/p2sh)
 * @property {string} inputsHash uint256	32	Hash of all the outpoints of the transaction inputs
 * @property {number} payloadSigSize compactSize uint	1-9	Size of the Signature
 * @property {string} payloadSig vector	Variable	Signature of the hash of the ProTx fields. Signed by the Owner.
 *
 * @param {ProUpRegTransactionPayloadJSON} [payloadJSON]
 * @constructor
 */

class ProUpRegTxPayload extends AbstractPayload {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    super();
    this.version = CURRENT_PAYLOAD_VERSION;
    this.mode = 0;
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

    return this;
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    this.parseOptions(options);
    this.proTxHash = options.proTxHash;
    this.pubKeyOperator = options.pubKeyOperator;
    this.keyIDVoting = options.keyIDVoting;
    this.scriptPayout = Script.fromAddress(options.payoutAddress).toString();
    this.inputsHash = options.inputsHash;
    if (options.payloadSig) {
      this.payloadSig = options.payloadSig;
    }
    this.validate();
    return this;
  }

  /**
   * Instantiate block from options.
   * @param {Object} options
   * @returns {Block}
   */

  static fromOptions(options) {
    return new ProUpRegTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parses raw ProUpRegTxPayload payload
   * @param {Buffer} rawPayload
   * @return {ProUpRegTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    var payload = new ProUpRegTxPayload();
    var signatureSize = 0;
    payload.version = payloadBufferReader.readU16();
    payload.proTxHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.mode = payloadBufferReader.readU16();
    payload.pubKeyOperator = payloadBufferReader
      .readBytes(BLS_PUBLIC_KEY_SIZE)
      .toString('hex');
    payload.keyIDVoting = payloadBufferReader
      .readBytes(PUBKEY_ID_SIZE)
      .reverse()
      .toString('hex');
    var scriptPayoutSize = payloadBufferReader.readVarint();
    payload.scriptPayout = payloadBufferReader
      .readBytes(scriptPayoutSize)
      .toString('hex');
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');

    if(payloadBufferReader.left() > 0) {
      signatureSize = payloadBufferReader.readVarint();
    }

    if (signatureSize > 0) {
      payload.payloadSig = payloadBufferReader
        .readBytes(signatureSize)
        .toString('hex');
    }

    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse proupreg payload: raw payload is bigger than expected.'
      );
    }

    payload.validate();
    return payload;
  };

  /**
   * Creates new instance of ProUpRegTxPayload payload from JSON
   * @param {string|ProUpRegTransactionPayloadJSON} payloadJSON
   * @return {ProUpRegTxPayload}
   */
  fromJSON(payloadJSON) {
    return new ProUpRegTxPayload(payloadJSON);
  };

  /* Instance methods */

  /**
   * Validates ProUpRegTxPayload payload data
   * @return {boolean}
   */
  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(util.isHexaString(this.pubKeyOperator), 'Expect pubKeyOperator to be a hex string');
    assert(util.isHexaString(this.keyIDVoting), 'Expect keyIDVoting to be a hex string');
    assert(util.isSha256HexString(this.proTxHash), 'expected proTxHash to be a sha256 hex string');
    assert(util.isSha256HexString(this.inputsHash), 'expected inputsHash to be a sha256 hex string');
    if (this.scriptPayout) {
      let script = new Script().fromRaw(Buffer.from(this.scriptPayout, 'hex'), 'hex');
      assert(script.isPubkeyhash() || script.isScripthash(), 'Expected scriptPayout to be a p2pkh/p2sh');
    }
    if (Boolean(this.payloadSig)) {
      assert(util.isHexaString(this.payloadSig), 'Expect payloadSig to be a hex string');
      assert(this.payloadSig.length * 2 !== BLS_SIGNATURE_SIZE, 'payloadSig size doesn\'t match BLS signature size');
    }
    return true;
  };

  /**
   * Serializes ProUpRegTxPayload payload to JSON
   * @param [options]
   * @param [options.skipSignature] - skip signature part. Needed for creating new signature
   * @param [options.network]
   * @return {ProUpRegTransactionPayloadJSON}
   */
  toJSON(options) {
    var skipSignature =
      Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
    var network = options && options.network;
    let script = new Script().fromRaw(Buffer.from(this.scriptPayout, 'hex'), 'hex');
    /**
     * @type {ProUpRegTransactionPayloadJSON}
     */
    var payloadJSON = {
      version: this.version,
      mode: this.mode,
      proTxHash: this.proTxHash,
      pubKeyOperator: this.pubKeyOperator,
      keyIDVoting: this.keyIDVoting,
      payoutAddress: new Address().fromScript(script).toString(),
      inputsHash: this.inputsHash,
    };
    if (!skipSignature) {
      payloadJSON.payloadSig = this.payloadSig;
    }
    return payloadJSON;
  };

  /**
   * Serializes ProUpRegTxPayload to buffer
   * @param [options]
   * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
   * @return {Buffer}
   */
  toBuffer(options) {
    var skipSignature =
      !Boolean(this.payloadSig) || (options && options.skipSignature);
    this.validate();
    var payloadBufferWriter = bio.write();

    payloadBufferWriter
      .writeU16(this.version)
      .writeHash(Buffer.from(this.proTxHash, 'hex').reverse())
      .writeU16(this.mode)
      .writeBytes(Buffer.from(this.pubKeyOperator, 'hex'))
      .writeBytes(Buffer.from(this.keyIDVoting, 'hex').reverse());

    if (this.scriptPayout) {
      var scriptPayoutBuf = Buffer.from(this.scriptPayout, 'hex');
      //var scriptPayoutSize = scriptPayoutBuf.length;
      //payloadBufferWriter.writeVarint(scriptPayoutSize);
      payloadBufferWriter.writeVarBytes(scriptPayoutBuf);
    } else {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    }

    payloadBufferWriter.writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    if (!skipSignature) {
      var signatureBuf = Buffer.from(this.payloadSig, 'hex');
      //payloadBufferWriter.writeVarint(signatureBuf.length);
      payloadBufferWriter.writeVarBytes(signatureBuf);
    } else {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    }

    return payloadBufferWriter.render();
  };

  /**
   * Copy payload instance
   * @return {ProUpRegTxPayload}
   */
  copy() {
    return ProUpRegTxPayload.fromJSON(this.toJSON());
  };

}

/*
 * Expose
 */

module.exports = ProUpRegTxPayload;
