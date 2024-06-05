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
  MASTERNODE_TYPE_HP,
  PLATFORM_NODE_ID_SIZE,
} = require('../../blockchain/params/common');
const assert = require('bsert');
const bio = require('bufio');
const Script = require('../../script/script');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');
const ipUtils = require('../../utils/ip');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @typedef {Object} ProUpServTxPayloadJSON
 * @property {number} version
 * @property {string} proTxHash
 * @property {string} service - Service string, ip and port
 * @property {string} [operatorPayoutAddress]
 * @property {string} inputsHash
 * @property {string} [payloadSig]
 */

/**
 * @class ProUpServTxPayload
 * @alias module:primitives.Payload.ProUpServTxPayload
 * @extends AbstractPayload
 * @property {number} version ProUpServTx version number. Currently set to 1.
 * @property {string} proTXHash The hash of the initial ProRegTx
 * @property {string} service string - ip and port
 * @property {string} inputsHash Hash of all the outpoints of the transaction inputs
 * @property {string} [scriptOperatorPayout] Payee script (p2pkh/p2sh)
 * @property {string} [payloadSig] BLSSig Signature of the hash of the ProUpServTx fields. Signed by the Operator.
 */

class ProUpServTxPayload extends AbstractPayload {
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
    this.version = options.version;
    if (this.version >= 2) {
      this.type = options.type;
    }
    this.proTxHash = options.proTxHash;
    this.service = options.service;
    this.operatorPayoutAddress = options.operatorPayoutAddress;
    this.scriptOperatorPayout = Script.fromAddress(options.operatorPayoutAddress).toString();
    this.inputsHash = options.inputsHash;

    if (this.version >= 2 && this.type === MASTERNODE_TYPE_HP) {
      this.platformNodeID = options.platformNodeID;
      this.platformP2PPort = options.platformP2PPort;
      this.platformHTTPPort = options.platformHTTPPort;
    }

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
    return new ProUpServTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw transition payload
   * @param {Buffer} rawPayload
   * @return {ProUpServTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    var payload = new ProUpServTxPayload();

    payload.version = payloadBufferReader.readU16();
    if (payload.version >= 2) {
      payload.type = payloadBufferReader.readU16();
    }
    payload.proTxHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    payload.service = ipUtils.bufferToIPAndPort(
      payloadBufferReader.readBytes(ipUtils.IP_AND_PORT_SIZE)
    );
    // Note: can be 0 if not updated!
    var scriptOperatorPayoutSize = payloadBufferReader.readVarint();
    payload.scriptOperatorPayout = payloadBufferReader
      .readBytes(scriptOperatorPayoutSize)
      .toString('hex');
    payload.inputsHash = payloadBufferReader
      .readHash()
      .reverse()
      .toString('hex');
    if (payload.version >= 2 && payload.type === MASTERNODE_TYPE_HP) {
      payload.platformNodeID = payloadBufferReader.readBytes(PLATFORM_NODE_ID_SIZE).reverse().toString('hex');
      payload.platformP2PPort = payloadBufferReader.readU16();
      payload.platformHTTPPort = payloadBufferReader.readU16();
    }
    payload.payloadSig = payloadBufferReader.readBytes(BLS_SIGNATURE_SIZE).toString('hex');

    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse proupserv payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  }

  /**
   * Create new instance of payload from JSON
   * @param {ProUpServTxPayloadJSON} payloadJson
   * @return {ProUpServTxPayload}
   */
  fromJSON(payloadJson) {
    var payload = new ProUpServTxPayload(payloadJson);
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
    if(this.version >= 2) {
      assert(fixed.isUnsignedInteger(this.type), 'Expect type to be an unsigned integer');
    }
    assert(util.isSha256HexString(this.proTxHash), 'Expect proTXHash to be a hex string representing sha256 hash');
    if (!ipUtils.isZeroAddress(this.service)) {
      assert(ipUtils.isIPV4(this.service), 'Expected service to be a string with ip address and port');
    }
    assert(util.isSha256HexString(this.inputsHash), 'Expect inputsHash to be a hex string representing sha256 hash');
    if (this.version >= 2 && this.type === MASTERNODE_TYPE_HP) {
      assert(util.isHexaString(this.platformNodeID), 'Expect platformNodeID to be a hex string');
      assert(fixed.isUnsignedInteger(this.platformP2PPort), 'Expect platformP2PPort to be an integer');
      assert(fixed.isUnsignedInteger(this.platformHTTPPort), 'Expect platformHTTPPort to be an integer');
    }
    if (this.scriptOperatorPayout) {
      let script = new Script().fromRaw(Buffer.from(this.scriptOperatorPayout, 'hex'), 'hex');
      assert(script.isPubkeyhash() || script.isScripthash(), 'Expected scriptPayout to be a p2pkh/p2sh');
    }
    if (Boolean(this.payloadSig)) {
      assert(util.isHexaString(this.payloadSig), 'Expect payloadSig to be a hex string');
      assert(this.payloadSig.length * 2 !== BLS_SIGNATURE_SIZE, 'payloadSig size doesn\'t match BLS signature size');
    }

    return true;
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @param [options.skipSignature]
   * @param [options.network] - network param for payout address serialization
   * @return {ProUpServTxPayloadJSON}
   */
  toJSON(options) {
    var noSignature = !Boolean(this.payloadSig);
    var skipSignature = noSignature || (options && options.skipSignature);
    var network = options && options.network;
    let script = new Script().fromRaw(Buffer.from(this.scriptOperatorPayout, 'hex'), 'hex');

    this.validate();

    /**
     * @type {ProUpServTxPayloadJSON}
     */
    var payloadJSON = {
      version: this.version,
      proTxHash: this.proTxHash,
      service: this.service,
      operatorPayoutAddress: this.scriptOperatorPayout,
      inputsHash: this.inputsHash,
    };

    if (this.version >= 2) {
      payloadJSON.type = this.type;
  
      if (this.type === MASTERNODE_TYPE_HP) {
        payloadJSON.platformNodeID = this.platformNodeID;
        payloadJSON.platformP2PPort = this.platformP2PPort;
        payloadJSON.platformHTTPPort = this.platformHTTPPort;
      }
    }

    if (!skipSignature) {
      payloadJSON.payloadSig = this.payloadSig;
    }
    return payloadJSON;
  }

  /**
   * Serialize payload to buffer
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature. Used for generating new signature
   * @return {Buffer}
   */
  toBuffer(options) {
    var noSignature = !Boolean(this.payloadSig);
    var skipSignature = noSignature || (options && options.skipSignature);

    this.validate();

    var payloadBufferWriter = bio.write();

    payloadBufferWriter.writeU16(this.version);

    if (this.version >= 2) {
      payloadBufferWriter.writeU16(this.type);
    }

    payloadBufferWriter.writeHash(Buffer.from(this.proTxHash, 'hex').reverse());

    payloadBufferWriter.writeBytes(ipUtils.ipAndPortToBuffer(this.service));

    var scriptOperatorPayout = Buffer.from(this.scriptOperatorPayout, 'hex');
    payloadBufferWriter.writeVarint(scriptOperatorPayout.length);
    payloadBufferWriter.writeBytes(scriptOperatorPayout);

    payloadBufferWriter.writeHash(Buffer.from(this.inputsHash, 'hex').reverse());

    if (this.version >= 2 && this.type === MASTERNODE_TYPE_HP) {
      payloadBufferWriter.writeBytes(Buffer.from(this.platformNodeID, 'hex').reverse())
        .writeU16(this.platformP2PPort)
        .writeU16(this.platformHTTPPort);
    }

    var payloadSignature;

    if (skipSignature) {
      payloadBufferWriter.writeVarint(EMPTY_SIGNATURE_SIZE);
    } else {
      payloadSignature = Buffer.from(this.payloadSig, 'hex');
      payloadBufferWriter.writeVarBytes(payloadSignature);
    }

    return payloadBufferWriter.render();
  }

  /**
   * Copy payload instance
   * @return {ProUpServTxPayload}
   */
  copy() {
    //return ProUpServTxPayload.fromJSON(this.toJSON());
    return ProUpServTxPayload.fromBuffer(this.toBuffer());
  }

}

/*
 * Expose
 */

module.exports = ProUpServTxPayload;
