/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const {common, llmq} = require('../../protocol/params');
const {
  BLS_PUBLIC_KEY_SIZE, 
  BLS_SIGNATURE_SIZE, 
  SHA256_HASH_SIZE, 
  HASH_QUORUM_INDEX_REQUIRED_VERSION, 
  isHashQuorumIndexRequired
} = common;
const {getLLMQParams} = llmq;
const assert = require('bsert');
const bio = require('bufio');
//const {inspectSymbol} = require('../../utils');
const {fixed, util} = require('../../utils');

const CURRENT_PAYLOAD_VERSION = 1;

/**
 * @typedef {Object} CommitmentTxPayloadJSON
 * @property {number} version	uint16_t	2	Commitment special transaction version number. Currently set to 1. Please note that this is not the same as the version field of qfcommit
 * @property {number} height	int32_t	2	The height of the block in which this commitment is included
 * @property {number} qfcVersion	uint16_t	2	Version of the final commitment message
 * @property {number} llmqtype	uint8_t	1	type of the long living masternode quorum
 * @property {string} quorumHash	uint256	32	The quorum identifier
 * @property {number} quorumIndex	int16	2	The quorum index
 * @property {number} signersSize	compactSize uint	1-9	Bit size of the signers bitvector
 * @property {string} signers	byte[]	(bitSize + 7) / 8	Bitset representing the aggregated signers of this final commitment
 * @property {number} validMembersSize	compactSize uint	1-9	Bit size of the validMembers bitvector
 * @property {string} validMembers	byte[]	(bitSize + 7) / 8	Bitset of valid members in this commitment
 * @property {string} quorumPublicKey	BLSPubKey	48	The quorum public key
 * @property {string} quorumVvecHash	uint256	32	The hash of the quorum verification vector
 * @property {string} quorumSig	BLSSig	96	Recovered threshold signature
 * @property {string} sig	BLSSig	96	Aggregated BLS signatures from all included commitments
 */

/**
 * @class CommitmentTxPayload
 * @alias module:primitives.Payload.Coinbase
 * @extends AbstractPayload
 * @property {number} version
 * @property {number} height
 * @property {number} qfcVersion
 * @property {number} llmqtype
 * @property {string} quorumHash
 * @property {number} quorumIndex
 * @property {number} signersSize
 * @property {string} signers
 * @property {number} validMembersSize
 * @property {string} validMembers
 * @property {string} quorumPublicKey
 * @property {string} quorumVvecHash
 * @property {string} quorumSig
 * @property {string} sig
 */


class CommitmentTxPayload extends AbstractPayload {
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
    assert(options, 'Commitment tx payload data is required.');

    this.height = options.height;
    this.qfcVersion = options.qfcVersion;
    this.llmqtype = options.llmqtype;
    this.quorumHash = options.quorumHash;
    this.quorumIndex = options.quorumIndex;
    this.signers = options.signers;
    this.validMembers = options.validMembers;
    this.quorumPublicKey = options.quorumPublicKey;
    this.quorumVvecHash = options.quorumVvecHash;
    this.quorumSig = options.quorumSig;
    this.sig = options.sig;

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
    return new CommitmentTxPayload.fromOptions(options);
  }

  /* Static methods */

  /**
   * Parse raw payload
   * @param {Buffer} rawPayload
   * @return {CommitmentTxPayload}
   */
  static fromBuffer(rawPayload) {
    let payloadBufferReader = bio.read(rawPayload);
    var payload = new CommitmentTxPayload();
    payload.version = payloadBufferReader.readU16();
    payload.height = payloadBufferReader.readI32();
    payload.qfcVersion = payloadBufferReader.readU16();
    payload.llmqtype = payloadBufferReader.readU8();
    payload.quorumHash = payloadBufferReader
      .readBytes(SHA256_HASH_SIZE)
      .toString('hex');
    if (isHashQuorumIndexRequired(payload.qfcVersion)) {
      payload.quorumIndex = payloadBufferReader.readI16();
    }

    //const fixedCounterLength = getLLMQParams(payload.llmqtype).size;

    payload.signersSize = payloadBufferReader.readVarint();
    const signersBytesToRead = Math.floor((payload.signersSize + 7) / 8) || 1;
    payload.signers = payloadBufferReader
      .readBytes(signersBytesToRead)
      .toString('hex');
    payload.validMembersSize = payloadBufferReader.readVarint();
    const validMembersBytesToRead = Math.floor((payload.validMembersSize + 7) / 8) || 1;
    payload.validMembers = payloadBufferReader
      .readBytes(validMembersBytesToRead)
      .toString('hex');
    payload.quorumPublicKey = payloadBufferReader
      .readBytes(BLS_PUBLIC_KEY_SIZE)
      .toString('hex');
    payload.quorumVvecHash = payloadBufferReader
      .readBytes(SHA256_HASH_SIZE)
      .toString('hex');
    payload.quorumSig = payloadBufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
      .toString('hex');
    payload.sig = payloadBufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
      .toString('hex');

    if(!payloadBufferReader.finished()) {
      throw new Error(
        'Failed to parse commitment payload: raw payload is bigger than expected.'
      );
    }

    return payload;
  }

  /**
   * Create new instance of payload from JSON
   * @param {string|CommitmentTxPayloadJSON} payloadJson
   * @return {CommitmentTxPayload}
   */
  fromJSON(payloadJson) {
    var payload = new CommitmentTxPayload(payloadJson);
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
    assert(fixed.isUnsignedInteger(this.height), 'Expect height to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.qfcVersion), 'Expect qfcVersion to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.llmqtype), 'Expect llmqtype to be an unsigned integer');
    assert(util.isHexa(this.quorumHash), 'Expect quorumHash to be a hex string');

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      assert(Number.isInteger(this.quorumIndex), 'Expect quorumHash to be an integer');
    }

    assert(util.isHexa(this.signers), 'Expect signers to be a hex string');
    assert(util.isHexa(this.validMembers), 'Expect validMembers to be a hex string');
    assert(util.isHexa(this.quorumPublicKey), 'Expect quorumPublicKey to be a hex string');
    assert(util.isHexa(this.quorumVvecHash), 'Expect quorumVvecHash to be a hex string');
    assert(util.isHexa(this.quorumSig), 'Expect quorumSig to be a hex string');
    assert(util.isHexa(this.sig), 'Expect sig to be a hex string');

    return true;
  }

  /**
   * Serializes payload to JSON
   * @param [options]
   * @return {CommitmentTxPayload}
   */
  toJSON(options) {
    this.validate();
    var payloadJSON = {
      version: this.version,
      height: this.height,
      qfcVersion: this.qfcVersion,
      llmqtype: this.llmqtype,
      quorumHash: util.revHexStr(this.quorumHash),
      signersSize: this.signersSize,
      signers: this.signers,
      validMembersSize: this.validMembersSize,
      validMembers: this.validMembers,
      quorumPublicKey: this.quorumPublicKey,
      quorumVvecHash: this.quorumVvecHash,
      quorumSig: this.quorumSig,
      sig: this.sig,
    };

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      payloadJSON.quorumIndex = this.quorumIndex;
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

    // This will validate quorum type
    getLLMQParams(this.llmqtype);

    var payloadBufferWriter = bio.write();
    payloadBufferWriter
      .writeU16(this.version)
      .writeU32(this.height)
      .writeU16(this.qfcVersion)
      .writeU8(this.llmqtype)
      .writeHash(Buffer.from(this.quorumHash, 'hex'));

    if (this.qfcVersion >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      payloadBufferWriter.writeI16(this.quorumIndex);
    }

    payloadBufferWriter
      .writeVarint(this.signersSize)
      .writeBytes(Buffer.from(this.signers, 'hex'))
      .writeVarint(this.validMembersSize)
      .writeBytes(Buffer.from(this.validMembers, 'hex'))
      .writeBytes(Buffer.from(this.quorumPublicKey, 'hex'))
      .writeBytes(Buffer.from(this.quorumVvecHash, 'hex'))
      .writeBytes(Buffer.from(this.quorumSig, 'hex'))
      .writeBytes(Buffer.from(this.sig, 'hex'));

    return payloadBufferWriter.render();
  };

  copy() {
    return CommitmentTxPayload.fromBuffer(this.toBuffer());
  }

}

/*
 * Expose
 */

module.exports = CommitmentTxPayload;
