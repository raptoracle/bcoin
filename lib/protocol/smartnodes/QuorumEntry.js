/*!
 * QuorumEntry.js - quorum object for bcoin
 * Copyright (c) 2024, Raptoracle developers (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';


const assert = require('bsert');
const bio = require('bufio');
const _ = require('lodash');
const hash256 = require('bcrypto/lib/hash256');

const bls = require('../../crypto/bls');

//const {inspectSymbol} = require('../../utils');
const {bitarray, fixed, util} = require('../../utils');

const {
  BLS_SIGNATURE_SIZE, 
  BLS_PUBLIC_KEY_SIZE, 
  HASH_QUORUM_INDEX_REQUIRED_VERSION,
  SHA256_HASH_SIZE,
} = require('../params/common');

const {getLLMQParams} = require('../params/llmq');

/**
 * @typedef {Object} SMLQuorumEntry
 * @property {number} version
 * @property {number} llmqType
 * @property {string} quorumHash
 * @property {number} [quorumIndex]
 * @property {number} signersCount
 * @property {string} signers
 * @property {number} validMembersCount
 * @property {string} validMembers
 * @property {string} quorumPublicKey
 * @property {string} quorumVvecHash
 * @property {string} quorumSig
 * @property {string} membersSig
 */

/**
 * @class QuorumEntry
 * @param {string|Object|Buffer} [arg] - A Buffer, JSON string,
 * or Object representing a SMLQuorumEntry
 * @constructor
 * @property {number} version
 * @property {number} llmqType
 * @property {string} quorumHash
 * @property {number} [quorumIndex]
 * @property {number} signersCount
 * @property {string} signers
 * @property {number} validMembersCount
 * @property {string} validMembers
 * @property {string} quorumPublicKey
 * @property {string} quorumVvecHash
 * @property {string} quorumSig
 * @property {string} membersSig
 */

class QuorumEntry {
  constructor(arg) {
    if (arg) {
      if (arg instanceof QuorumEntry) {
        return arg.copy();
      }
  
      if (Buffer.isBuffer(arg) || arg instanceof Uint8Array) {
        return QuorumEntry.fromBuffer(arg);
      }
  
      if (_.isObject(arg)) {
        return QuorumEntry.fromObject(arg);
      }
  
      if (arg instanceof QuorumEntry) {
        return arg.copy();
      }
  
      if (isHexString(arg)) {
        return QuorumEntry.fromHexString(arg);
      }
      throw new TypeError('Unrecognized argument for QuorumEntry');
    }
  }

  /**
   * Parse buffer and returns QuorumEntry
   * @param {Buffer} buffer
   * @return {QuorumEntry}
   */
  fromBuffer(buffer) {
    const bufferReader = bio.read(buffer);
    const SMLQuorumEntry = new QuorumEntry();
    SMLQuorumEntry.isVerified = false;
    if (buffer.length < 100) {
      SMLQuorumEntry.isOutdatedRPC = true;
      SMLQuorumEntry.version = bufferReader.readU16();
      SMLQuorumEntry.llmqType = bufferReader.readU8();
      SMLQuorumEntry.quorumHash = bufferReader
        .readHash()
        .reverse()
        .toString('hex');

      if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
        SMLQuorumEntry.quorumIndex = bufferReader.readI16();
      }

      SMLQuorumEntry.signersCount = bufferReader.readVarint();
      SMLQuorumEntry.validMembersCount = bufferReader.readVarint();
      SMLQuorumEntry.quorumPublicKey = bufferReader
        .readBytes(BLS_PUBLIC_KEY_SIZE)
        .toString('hex');

      return SMLQuorumEntry;
    }
    SMLQuorumEntry.isOutdatedRPC = false;
    SMLQuorumEntry.version = bufferReader.readU16();
    SMLQuorumEntry.llmqType = bufferReader.readU8();
    SMLQuorumEntry.quorumHash = bufferReader
      .readHash()
      .reverse()
      .toString('hex');

    if (SMLQuorumEntry.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      SMLQuorumEntry.quorumIndex = bufferReader.readI16();
    }

    SMLQuorumEntry.signersCount = bufferReader.readVarint();
    const signersBytesToRead =
      Math.floor((getLLMQParams(SMLQuorumEntry.llmqType).size + 7) / 8) || 1;
    SMLQuorumEntry.signers = bufferReader
      .readBytes(signersBytesToRead)
      .toString('hex');
    SMLQuorumEntry.validMembersCount = bufferReader.readVarint();
    const validMembersBytesToRead =
      Math.floor((getLLMQParams(SMLQuorumEntry.llmqType).size + 7) / 8) || 1;
    SMLQuorumEntry.validMembers = bufferReader
      .readBytes(validMembersBytesToRead)
      .toString('hex');
    SMLQuorumEntry.quorumPublicKey = bufferReader
      .readBytes(BLS_PUBLIC_KEY_SIZE)
      .toString('hex');
    SMLQuorumEntry.quorumVvecHash = bufferReader
      .readHash()
      .reverse()
      .toString('hex');
    SMLQuorumEntry.quorumSig = bufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
      .toString('hex');
    SMLQuorumEntry.membersSig = bufferReader
      .readBytes(BLS_SIGNATURE_SIZE)
      .toString('hex');

    return SMLQuorumEntry;
  }

  /**
   * @param {string} string
   * @return {QuorumEntry}
   */
  fromHexString(string) {
    return QuorumEntry.fromBuffer(Buffer.from(string, 'hex'));
  }

  /**
   * Serialize SML entry to buf
   * @return {Buffer}
   */
  toBuffer() {
    this.validate();
    const bufferWriter = bio.write();

    bufferWriter.writeU16(this.version);
    bufferWriter.writeU8(this.llmqType);
    bufferWriter.writeHash(Buffer.from(this.quorumHash, 'hex').reverse());

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      bufferWriter.writeI16(this.quorumIndex);
    }

    bufferWriter.writeVarint(this.signersCount);

    if (this.isOutdatedRPC) {
      bufferWriter.writeVarint(this.validMembersCount);
      bufferWriter.writeBytes(Buffer.from(this.quorumPublicKey, 'hex'));

      return bufferWriter.render();
    }

    bufferWriter.writeBytes(Buffer.from(this.signers, 'hex'));
    bufferWriter.writeVarint(this.validMembersCount);
    bufferWriter.writeBytes(Buffer.from(this.validMembers, 'hex'));
    bufferWriter.writeBytes(Buffer.from(this.quorumPublicKey, 'hex'));
    bufferWriter.writeHash(Buffer.from(this.quorumVvecHash, 'hex').reverse());
    bufferWriter.writeBytes(Buffer.from(this.quorumSig, 'hex'));
    bufferWriter.writeBytes(Buffer.from(this.membersSig, 'hex'));

    return bufferWriter.render();
  }

  /**
   * Serialize SML entry to buf
   * @return {Buffer}
   */
  toBufferForHashing() {
    this.validate();
    const bufferWriter = bio.write();
    const fixedCounterLength = getLLMQParams(this.llmqType).size;
    bufferWriter.writeU16(this.version);
    bufferWriter.writeU8(this.llmqType);
    bufferWriter.writeHash(Buffer.from(this.quorumHash, 'hex').reverse());

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      bufferWriter.writeI16(this.quorumIndex);
    }

    bufferWriter.writeVarint(fixedCounterLength);
    bufferWriter.writeBytes(Buffer.from(this.signers, 'hex'));
    bufferWriter.writeVarint(fixedCounterLength);
    bufferWriter.writeBytes(Buffer.from(this.validMembers, 'hex'));
    bufferWriter.writeBytes(Buffer.from(this.quorumPublicKey, 'hex'));
    bufferWriter.writeHash(Buffer.from(this.quorumVvecHash, 'hex').reverse());
    bufferWriter.writeBytes(Buffer.from(this.quorumSig, 'hex'));
    bufferWriter.writeBytes(Buffer.from(this.membersSig, 'hex'));

    return bufferWriter.render();
  }

  /**
   * Create SMLQuorumEntry from an object
   * @param {SMLQuorumEntry} obj
   * @return {QuorumEntry}
   */
  fromObject(obj) {
    const SMLQuorumEntry = new QuorumEntry();
    SMLQuorumEntry.isVerified = false;
    SMLQuorumEntry.isOutdatedRPC = false;
    SMLQuorumEntry.version = obj.version;
    SMLQuorumEntry.llmqType = obj.llmqType;
    SMLQuorumEntry.quorumHash = obj.quorumHash;
    SMLQuorumEntry.quorumIndex = obj.quorumIndex;
    SMLQuorumEntry.signersCount = obj.signersCount;
    SMLQuorumEntry.signers = obj.signers;
    SMLQuorumEntry.validMembersCount = obj.validMembersCount;
    SMLQuorumEntry.validMembers = obj.validMembers;
    SMLQuorumEntry.quorumPublicKey = obj.quorumPublicKey;
    SMLQuorumEntry.quorumVvecHash = obj.quorumVvecHash;
    SMLQuorumEntry.quorumSig = obj.quorumSig;
    SMLQuorumEntry.membersSig = obj.membersSig;
    if (SMLQuorumEntry.signers === undefined) {
      SMLQuorumEntry.isOutdatedRPC = true;
    }
    SMLQuorumEntry.validate();
    return SMLQuorumEntry;
  }

  validate() {
    assert(fixed.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.llmqType), 'Expect llmqType to be an unsigned integer');
    assert(util.isSha256HexString(this.quorumHash), 'Expected quorumHash to be a sha256 hex string');

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      assert(Number.isInteger(this.quorumIndex), 'Expected quorumIndex to be an integer');
    }

    assert(fixed.isUnsignedInteger(this.signersCount), 'Expect signersCount to be an unsigned integer');
    assert(fixed.isUnsignedInteger(this.validMembersCount), 'Expect validMembersCount to be an unsigned integer');
    assert(util.isHexStringOfSize(this.quorumPublicKey, BLS_PUBLIC_KEY_SIZE * 2), 'Expected quorumPublicKey to be a bls pubkey');

    if (!this.isOutdatedRPC) {
      assert(util.isHexaString(this.signers), 'Expect signers to be a hex string');
      assert(util.isHexaString(this.validMembers), 'Expect signers to be a hex string');
      assert(util.isHexStringOfSize(this.quorumVvecHash, SHA256_HASH_SIZE * 2), `Expected quorumVvecHash to be a hex string of size ${SHA256_HASH_SIZE}`);
      assert(util.isHexStringOfSize(this.quorumSig, BLS_SIGNATURE_SIZE * 2), 'Expected quorumSig to be a bls signature');
      assert(util.isHexStringOfSize(this.membersSig, BLS_SIGNATURE_SIZE * 2), 'Expected membersSig to be a bls signature');
    }

    return true;
  }

  toObject() {
    const result = {
      version: this.version,
      llmqType: this.llmqType,
      quorumHash: this.quorumHash,
      signersCount: this.signersCount,
      signers: this.signers,
      validMembersCount: this.validMembersCount,
      validMembers: this.validMembers,
      quorumPublicKey: this.quorumPublicKey,
      quorumVvecHash: this.quorumVvecHash,
      quorumSig: this.quorumSig,
      membersSig: this.membersSig,
    };

    if (this.version >= HASH_QUORUM_INDEX_REQUIRED_VERSION) {
      result.quorumIndex = this.quorumIndex;
    }

    return result;
  }

  /**
   * Serialize quorum entry commitment to buf
   * This is the message hash signed by the quorum for verification
   * @return {Uint8Array}
   */
  getCommitmentHash() {
    const bufferWriter = bio.write();
    bufferWriter.writeU8(this.llmqType);
    bufferWriter.writeHash(Buffer.from(this.quorumHash, 'hex').reverse());
    bufferWriter.writeVarint(getLLMQParams(this.llmqType).size);
    bufferWriter.writeBytes(Buffer.from(this.validMembers, 'hex'));
    bufferWriter.writeBytes(Buffer.from(this.quorumPublicKey, 'hex'));
    bufferWriter.writeHash(Buffer.from(this.quorumVvecHash, 'hex').reverse());

    return hash256.digest(bufferWriter.render());
  }

  /**
   * Verifies the quorum's bls threshold signature
   * @return {Promise<boolean>}
   */
  isValidQuorumSig() {
    if (this.isOutdatedRPC) {
      throw new Error(
        'Quorum cannot be verified: node running on outdated DashCore version (< 0.16)'
      );
    }

    return bls.verifySignature(
      this.quorumSig,
      Uint8Array.from(this.getCommitmentHash()),
      this.quorumPublicKey
    );
  }

  /**
   * Verifies the quorum's aggregated operator key signature
   * @param {SimplifiedMNList} mnList - MNList for the block (quorumHash)
   * @return {Promise<boolean>}
   */
  isValidMemberSig(mnList) {
    if (mnList.blockHash !== this.quorumHash) {
      throw new Error(`Wrong Masternode List for quorum: blockHash
        ${mnList.blockHash} doesn't correspond with quorumHash ${this.quorumHash}`);
    }
    if (this.isOutdatedRPC) {
      throw new Error(
        'Quorum cannot be verified: node running on outdated DashCore version (< 0.16)'
      );
    }

    const quorumMembers = this.getAllQuorumMembers(mnList);
    const publicKeyStrings = quorumMembers.map(
      (quorumMember) => quorumMember.pubKeyOperator
    );

    const signersBits = bitarray.uint8ArrayToBitArray(
      Uint8Array.from(Buffer.from(this.signers, 'hex'))
    );

    return bls.verifyAggregatedSignature(
      this.membersSig,
      Uint8Array.from(this.getCommitmentHash()),
      publicKeyStrings,
      signersBits
    );
  }

  /**
   * verifies the quorum against the det. MNList that was active
   * when the quorum was starting its DKG session. Two different
   * types of BLS signature verifications are performed:
   * 1. the quorumSig is verified with the quorumPublicKey
   * 2. the quorum members are re-calculated and the memberSig is
   * verified against their aggregated pubKeyOperator values
   * @param {SimplifiedMNList} quorumSMNList - MNList for the block (quorumHash)
   * the quorum was starting its DKG session with
   * @return {Promise<boolean>}
   */
  verify(quorumSMNList) {
    return new Promise((resolve, reject) => {
      if (quorumSMNList.blockHash !== this.quorumHash) {
        return reject(
          new Error(`Wrong Masternode List for quorum: blockHash
        ${quorumSMNList.blockHash} doesn't correspond with quorumHash ${this.quorumHash}`)
        );
      }
      if (this.isOutdatedRPC) {
        return reject(
          new Error(
            'Quorum cannot be verified: node running on outdated DashCore version (< 0.16)'
          )
        );
      }

      // only verify if quorum hasn't already been verified
      if (this.isVerified) {
        return resolve(true);
      }

      return this.isValidMemberSig(quorumSMNList)
        .then((isValidMemberSig) => {
          if (!isValidMemberSig) {
            return false;
          }

          return this.isValidQuorumSig();
        })
        .then((isVerified) => {
          this.isVerified = isVerified;

          resolve(isVerified);
        });
    });
  }

  /**
   * Get all members for this quorum
   * @param {SimplifiedMNList} SMNList - MNlist for the quorum
   * @return {SimplifiedMNListEntry[]}
   */
  getAllQuorumMembers(SMNList) {
    if (SMNList.blockHash !== this.quorumHash) {
      throw new Error(`Wrong Masternode List for quorum: blockHash
        ${SMNList.blockHash} doesn't correspond with quorumHash ${this.quorumHash}`);
    }
    return SMNList.calculateQuorum(
      this.getSelectionModifier(),
      getLLMQParams(this.llmqType).size
    );
  }

  /**
   * Gets the modifier for deterministic sorting of the MNList
   * for quorum member selection
   * @return {Buffer}
   */
  getSelectionModifier() {
    const bufferWriter = bio.write();
    bufferWriter.writeU8(this.llmqType);
    bufferWriter.writeHash(Buffer.from(this.quorumHash, 'hex').reverse());
    return hash256.digest(bufferWriter.toBuffer()).reverse();
  }

  /**
   * Gets the ordering hash for a requestId
   * @param {string} requestId - the requestId for the signing session to be verified
   * @return {Buffer}
   */
  getOrderingHashForRequestId(requestId) {
    const buf = Buffer.concat([
      Buffer.from(this.llmqType),
      Buffer.from(this.quorumHash, 'hex'),
      Buffer.from(requestId, 'hex'),
    ]);
    return hash256.digest(buf).reverse();
  }

  /**
   * @return {Buffer}
   */
  calculateHash() {
    return hash256.digest(this.toBufferForHashing()).reverse();
  }

  /**
   * Creates a copy of QuorumEntry
   * @return {QuorumEntry}
   */
  copy() {
    return QuorumEntry.fromBuffer(this.toBuffer());
  }
}

/*
 * Expose
 */

module.exports = QuorumEntry;
