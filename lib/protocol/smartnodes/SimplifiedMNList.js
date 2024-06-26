/*!
 * abstractpayload.js - abstract payload object for bcoin
 * Copyright (c) 2024, socialruins (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

const assert = require('bsert');
const bio = require('bufio');
//const util = require('../utils/util');
//const consensus = require('../protocol/consensus');
//const {inspectSymbol} = require('../utils');
const hash256 = require('bcrypto/lib/hash256');
const {common, llmq} = require('../params');

const groupBy = require('lodash/groupBy');
//const BufferWriter = require('../encoding/bufferwriter');
//const Hash = require('../crypto/hash');
//const { getMerkleTree, getMerkleRoot } = require('../util/merkletree');
const SimplifiedMNListDiff = require('./SimplifiedMNListDiff');
const QuorumEntry = require('./QuorumEntry');
const SimplifiedMNListEntry = require('./SimplifiedMNListEntry');
//const PartialMerkleTree = require('../block/PartialMerkleTree');
//const constants = require('../constants');
//const Networks = require('../networks');
//const Transaction = require('../transaction');

const {
  getLLMQParams
} = llmq;

/**
 * SimplifiedMNList
 * Represents MN List.
 * @alias module:primitives.deterministicmnlist.SimplifiedMNList
 */

class SimplifiedMNList {
  /**
   * Create an filter.
   * @constructor
   */

  constructor(network, simplifiedMNListDiff) {
    this.network = network;
    this.baseBlockHash = common.NULL_HASH;
    this.blockHash = common.NULL_HASH;
    /**
     * Note that this property contains ALL masternodes, including banned ones.
     * Use getValidMasternodesList() method to get the list of only valid nodes.
     * This in needed for merkleRootNMList calculation
     * @type {SimplifiedMNListEntry[]}
     */
    this.mnList = [];
    /**
     * This property contains all active quorums
     * ordered by llmqType and creation time ascending.
     * @type {QuorumEntry[]}
     */
    this.quorumList = [];
    /**
     * This property contains only valid, not PoSe-banned nodes.
     * @type {SimplifiedMNListEntry[]}
     */
    this.validMNs = [];
    this.merkleRootMNList = common.NULL_HASH;
    this.lastDiffMerkleRootMNList = common.NULL_HASH;
    this.lastDiffMerkleRootQuorums = common.NULL_HASH;
    this.quorumsActive = false;
    this.cbTx = null;
    this.cbTxMerkleTree = null;
    if (simplifiedMNListDiff) {
      this.applyDiff(simplifiedMNListDiff);
    }
  }


  /**
   *
   * @param {SimplifiedMNListDiff|Buffer|string|Object} simplifiedMNListDiff - serialized or parsed
   * @return {void|Boolean}
   */
  applyDiff(simplifiedMNListDiff) {
    // This will copy an instance of SimplifiedMNListDiff or create a new instance
    const diff = new SimplifiedMNListDiff(simplifiedMNListDiff, this.network);

    // only when we apply the first diff we set the network
    if (!this.network) {
      this.network = diff.network;
    }

    if (this.baseBlockHash === common.NULL_HASH) {
      /* If the base block hash is a null hash, then this is the first time we apply any diff.
      * If we apply diff to the list for the first time, then diff's base block hash would be
      * the base block hash for the whole list.
      * */
      this.baseBlockHash = diff.baseBlockHash;
    }

    this.blockHash = diff.blockHash;

    if (this.lastBlockHash && this.lastBlockHash !== diff.baseBlockHash) {
      throw new Error(
        "Cannot apply diff: previous blockHash needs to equal the new diff's baseBlockHash"
      );
    }

    this.deleteMNs(diff.deletedMNs);
    this.addOrUpdateMNs(diff.mnList);

    this.lastDiffMerkleRootMNList = diff.merkleRootMNList || common.NULL_HASH;

    this.merkleRootMNList = this.calculateMerkleRoot();

    if (this.lastDiffMerkleRootMNList !== this.merkleRootMNList) {
      throw new Error(
        "Merkle root from the diff doesn't match calculated merkle root after diff is applied"
      );
    }

    this.cbTx = new Transaction(diff.cbTx);
    this.cbTxMerkleTree = diff.cbTxMerkleTree.copy();
    this.validMNs = this.mnList.filter((smlEntry) => smlEntry.isValid);
    this.quorumsActive = this.cbTx.version >= 2;

    if (this.quorumsActive) {
      this.deleteQuorums(diff.deletedQuorums);
      this.addAndMaybeRemoveQuorums(diff.newQuorums);
      this.lastDiffMerkleRootQuorums =
        diff.merkleRootQuorums || common.NULL_HASH;

      if (this.quorumList.length > 0) {
        // we cannot verify the quorum merkle root for DashCore vers. < 0.16
        if (this.quorumList[0].isOutdatedRPC) {
          this.merkleRootQuorums = diff.merkleRootQuorums;
          return;
        }
        this.quorumList = this.sortQuorums(this.quorumList);
        this.merkleRootQuorums = this.calculateMerkleRootQuorums();
        if (this.lastDiffMerkleRootQuorums !== this.merkleRootQuorums) {
          throw new Error(
            "merkleRootQuorums from the diff doesn't match calculated quorum root after diff is applied"
          );
        }
      }
    }
    this.lastBlockHash = this.blockHash;
  }

  /**
   * @private
   * Adds MNs to the MN list
   * @param {SimplifiedMNListEntry[]} mnListEntries
   */
  addOrUpdateMNs(mnListEntries) {
    const newMNListEntries = mnListEntries.map((mnListEntry) =>
      mnListEntry.copy()
    );
    // eslint-disable-next-line consistent-return
    newMNListEntries.forEach(function (newMNListEntry) {
      const indexOfOldEntry = this.mnList.findIndex(
        (oldMNListEntry) =>
          oldMNListEntry.proRegTxHash === newMNListEntry.proRegTxHash
      );
      if (indexOfOldEntry > -1) {
        this.mnList[indexOfOldEntry] = newMNListEntry;
      } else {
        return this.mnList.push(newMNListEntry);
      }
    }, this);
  }

  /**
   * @private
   * Adds quorums to the quorum list
   * and maybe removes the oldest ones
   * if list has reached maximum entries for llmqType
   * @param {QuorumEntry[]} quorumEntries
   */
  addAndMaybeRemoveQuorums(quorumEntries) {
    const newGroupedQuorums = groupBy(quorumEntries, 'llmqType');
    const existingQuorums = groupBy(this.quorumList, 'llmqType');
    const newQuorumsTypes = Object.keys(newGroupedQuorums);

    newQuorumsTypes.forEach((quorumType) => {
      const numberOfQuorumsInTheList = existingQuorums[quorumType]
        ? existingQuorums[quorumType].length
        : 0;
      const numberOfQuorumsToAdd = newGroupedQuorums[quorumType]
        ? newGroupedQuorums[quorumType].length
        : 0;
      const maxAllowedQuorumsOfType = getLLMQParams(
        Number(quorumType)
      ).maximumActiveQuorumsCount;

      if (
        numberOfQuorumsInTheList + numberOfQuorumsToAdd >
        maxAllowedQuorumsOfType
      ) {
        throw new Error(
          `Trying to add more quorums to quorum type ${quorumType} than its maximumActiveQuorumsCount of ${maxAllowedQuorumsOfType} permits`
        );
      }

      this.quorumList = this.quorumList.concat(newGroupedQuorums[quorumType]);
    });
  }

  /**
   * @private
   * Deletes MNs from the MN list
   * @param {string[]} proRegTxHashes - list of proRegTxHashes to delete from MNList
   */
  deleteMNs(proRegTxHashes) {
    proRegTxHashes.forEach(function (proRegTxHash) {
      const mnIndex = this.mnList.findIndex(
        (MN) => MN.proRegTxHash === proRegTxHash
      );
      if (mnIndex > -1) {
        this.mnList.splice(mnIndex, 1);
      }
    }, this);
  }

  /**
   * @private
   * Deletes quorums from the quorum list
   * @param {Array<obj>} deletedQuorums - deleted quorum objects
   */
  deleteQuorums(deletedQuorums) {
    deletedQuorums.forEach(function (deletedQuorum) {
      const quorumIndex = this.quorumList.findIndex(
        (quorum) =>
          quorum.llmqType === deletedQuorum.llmqType &&
          quorum.quorumHash === deletedQuorum.quorumHash
      );
      if (quorumIndex > -1) {
        this.quorumList.splice(quorumIndex, 1);
      }
    }, this);
  }

  /**
   * Compares merkle root from the most recent diff applied matches the merkle root of the list
   * @returns {boolean}
   */
  verify() {
    return this.calculateMerkleRoot() === this.lastDiffMerkleRootMNList;
  }

  /**
   * @private
   * Sorts MN List in deterministic order
   */
  sort() {
    this.mnList.sort((a, b) =>
      Buffer.compare(
        Buffer.from(a.proRegTxHash, 'hex').reverse(),
        Buffer.from(b.proRegTxHash, 'hex').reverse()
      )
    );
  }

  /**
   * @private
   * @param {QuorumEntry[]} quorumList - sort array of quorum entries
   * Sorts the quorums deterministically
   */
  sortQuorums(quorumList) {
    quorumList.sort((a, b) => {
      const hashA = Buffer.from(a.calculateHash()).reverse();
      const hashB = Buffer.from(b.calculateHash()).reverse();
      return Buffer.compare(hashA, hashB);
    });
    return quorumList;
  }

  /**
   * Calculates merkle root of the MN list
   * @returns {string}
   */
  calculateMerkleRoot() {
    if (this.mnList.length < 1) {
      return common.NULL_HASH;
    }
    this.sort();
    const sortedEntryHashes = this.mnList.map((mnListEntry) =>
      mnListEntry.calculateHash()
    );
    return getMerkleRoot(getMerkleTree(sortedEntryHashes))
      .reverse()
      .toString('hex');
  };

  /**
   * Calculates merkle root of the quorum list
   * @returns {string}
   */
  calculateMerkleRootQuorums() {
    if (this.quorumList.length < 1) {
      return common.NULL_HASH;
    }
    const sortedHashes = this.quorumList.map((quorum) =>
      quorum.calculateHash().reverse()
    );
    return getMerkleRoot(getMerkleTree(sortedHashes)).reverse().toString('hex');
  }

  /**
   * Returns a list of valid masternodes
   * @returns {SimplifiedMNListEntry[]}
   */
  getValidMasternodesList() {
    return this.validMNs;
  }

  /**
   * Returns a single quorum
   * @param {llmq.LLMQ_TYPES} llmqType - llmqType of quorum
   * @param {string} quorumHash - quorumHash of quorum
   * @returns {QuorumEntry}
   */
  getQuorum(llmqType, quorumHash) {
    return this.quorumList.find(
      (quorum) => quorum.llmqType === llmqType && quorum.quorumHash === quorumHash
    );
  }

  /**
   * Returns all quorums - verified or unverified
   * @returns {QuorumEntry[]}
   */
  getQuorums() {
    return this.quorumList;
  }

  /**
   * Returns only quorums of type llmqType - verified or unverified
   * @param {llmq.LLMQ_TYPES} llmqType - llmqType of quorum
   * @returns {QuorumEntry[]}
   */
  getQuorumsOfType(llmqType) {
    return this.quorumList.filter((quorum) => quorum.llmqType === llmqType);
  }

  /**
   * Returns all already verified quorums
   * @returns {QuorumEntry[]}
   */
  getVerifiedQuorums() {
    return this.quorumList.filter((quorum) => quorum.isVerified);
  }

  /**
   * Returns only already verified quorums of type llmqType
   * @param {llmq.LLMQ_TYPES} llmqType - llmqType of quorum
   * @returns {QuorumEntry[]}
   */
  getVerifiedQuorumsOfType(llmqType) {
    return this.quorumList.filter(
      (quorum) => quorum.isVerified && quorum.llmqType === llmqType
    );
  }

  /**
   * Returns all still unverified quorums
   * @returns {QuorumEntry[]}
   */
  getUnverifiedQuorums() {
    return this.quorumList.filter((quorum) => !quorum.isVerified);
  }

  /**
   * @return {constants.LLMQ_TYPES[]}
   */
  getLLMQTypes() {
    let llmqTypes = [];

    if (!this.network) {
      throw new Error('Network is not set');
    }

    switch (this.network.name) {
      case Networks.livenet.name:
        llmqTypes = [
          constants.LLMQ_TYPES.LLMQ_TYPE_50_60,
          constants.LLMQ_TYPES.LLMQ_TYPE_60_75,
          constants.LLMQ_TYPES.LLMQ_TYPE_400_60,
          constants.LLMQ_TYPES.LLMQ_TYPE_400_85,
          constants.LLMQ_TYPES.LLMQ_TYPE_100_67,
        ];
        return llmqTypes;
      case Networks.testnet.name:
        if (this.mnList.length > 100) {
          llmqTypes = [
            constants.LLMQ_TYPES.LLMQ_TYPE_50_60,
            constants.LLMQ_TYPES.LLMQ_TYPE_60_75,
            constants.LLMQ_TYPES.LLMQ_TYPE_400_60,
            constants.LLMQ_TYPES.LLMQ_TYPE_400_85,
            constants.LLMQ_TYPES.LLMQ_TYPE_TEST_V17,
          ];
          return llmqTypes;
        }
        // regtest
        if (Networks.testnet.regtestEnabled === true) {
          llmqTypes = [
            constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_TEST,
            constants.LLMQ_TYPES.LLMQ_TYPE_50_60,
            constants.LLMQ_TYPES.LLMQ_TYPE_60_75,
            constants.LLMQ_TYPES.LLMQ_TYPE_TEST_V17,
            constants.LLMQ_TYPES.LLMQ_TYPE_TEST_INSTANTSEND,
            constants.LLMQ_TYPES.LLMQ_TYPE_TEST_DIP0024,
          ];
          return llmqTypes;
        }
        // devnet
        llmqTypes = [
          constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_DEVNET,
          constants.LLMQ_TYPES.LLMQ_TYPE_50_60,
          constants.LLMQ_TYPES.LLMQ_TYPE_60_75,
          constants.LLMQ_TYPES.LLMQ_TYPE_400_60,
          constants.LLMQ_TYPES.LLMQ_TYPE_400_85,
          constants.LLMQ_TYPES.LLMQ_TYPE_TEST_V17,
          constants.LLMQ_TYPES.LLMQ_TYPE_TEST_INSTANTSEND,
          constants.LLMQ_TYPES.LLMQ_TYPE_TEST_DIP0024,
          constants.LLMQ_TYPES.LLMQ_DEVNET_DIP0024,
        ];
        return llmqTypes;
      default:
        throw new Error('Unknown network');
    }
  }

  /**
   * @return {constants.LLMQ_TYPES}
   */
  getChainlockLLMQType() {
    if (!this.network) {
      throw new Error('Network is not set');
    }

    switch (this.network.name) {
      case Networks.livenet.name:
        return constants.LLMQ_TYPES.LLMQ_TYPE_400_60;
      case Networks.testnet.name:
        if (this.mnList.length > 100) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_50_60;
        }
        // regtest
        if (Networks.testnet.regtestEnabled === true) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_TEST;
        }
        // devnet
        return constants.LLMQ_TYPES.LLMQ_TYPE_50_60;
      default:
        throw new Error('Unknown network');
    }
  }

  /**
   * @return {constants.LLMQ_TYPES}
   */
  getValidatorLLMQType() {
    if (!this.network) {
      throw new Error('Network is not set');
    }

    switch (this.network.name) {
      case Networks.livenet.name:
        return constants.LLMQ_TYPES.LLMQ_TYPE_100_67;
      case Networks.testnet.name:
        if (this.mnList.length > 100) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_100_67;
        }
        // regtest
        if (Networks.testnet.regtestEnabled === true) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_TEST;
        }
        // devnet
        return constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_DEVNET;
      default:
        throw new Error('Unknown network');
    }
  }

  /**
   * @return {constants.LLMQ_TYPES}
   */
  getInstantSendLLMQType() {
    if (!this.network) {
      throw new Error('Network is not set');
    }

    switch (this.network.name) {
      case Networks.livenet.name:
        return constants.LLMQ_TYPES.LLMQ_TYPE_50_60;
      case Networks.testnet.name:
        if (this.mnList.length > 100) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_50_60;
        }
        // regtest
        if (Networks.testnet.regtestEnabled === true) {
          return constants.LLMQ_TYPES.LLMQ_TYPE_LLMQ_TEST;
        }
        // devnet
        return constants.LLMQ_TYPES.LLMQ_TYPE_50_60;
      default:
        throw new Error('Unknown network');
    }
  }

  /**
   * Converts simplified MN list to simplified MN list diff that can be used to serialize data
   * to json, buffer, or a hex string
   * @param {string} [network]
   */
  toSimplifiedMNListDiff(network) {
    if (!this.cbTx || !this.cbTxMerkleTree) {
      throw new Error("Can't convert MN list to diff - cbTx is missing");
    }
    return SimplifiedMNListDiff.fromObject(
      {
        baseBlockHash: this.baseBlockHash,
        blockHash: this.blockHash,
        cbTx: new Transaction(this.cbTx),
        cbTxMerkleTree: this.cbTxMerkleTree,
        // Always empty, as simplified MN list doesn't have a deleted mn list
        deletedMNs: [],
        mnList: this.mnList,
        deletedQuorums: [],
        newQuorums: this.quorumList,
        merkleRootMNList: this.merkleRootMNList,
        merkleRootQuorums: this.merkleRootQuorums,
      },
      network
    );
  }

  /**
   * Recreates SML from json
   * @param {Object} smlJson
   */
  fromJSON(smlJson) {
    const sml = new SimplifiedMNList();
    sml.baseBlockHash = smlJson.baseBlockHash;
    sml.blockHash = smlJson.blockHash;
    sml.merkleRootMNList = smlJson.merkleRootMNList;
    sml.lastDiffMerkleRootMNList = smlJson.lastDiffMerkleRootMNList;
    sml.lastDiffMerkleRootQuorums = smlJson.lastDiffMerkleRootQuorums;
    sml.quorumsActive = smlJson.quorumsActive;
    sml.cbTx = new Transaction(smlJson.cbTx);
    sml.cbTxMerkleTree = new PartialMerkleTree();
    sml.cbTxMerkleTree.totalTransactions =
      smlJson.cbTxMerkleTree.totalTransactions;
    sml.cbTxMerkleTree.merkleHashes = smlJson.cbTxMerkleTree.merkleHashes;
    sml.cbTxMerkleTree.merkleFlags = smlJson.cbTxMerkleTree.merkleFlags;
    sml.mnList = smlJson.mnList.map(
      (mnRecord) => new SimplifiedMNListEntry(mnRecord)
    );
    sml.quorumList = smlJson.quorumList.map(
      (quorumEntry) => new QuorumEntry(quorumEntry)
    );
    sml.validMNs = smlJson.validMNs.map(
      (mnRecord) => new SimplifiedMNListEntry(mnRecord)
    );

    return sml;
  };

  /**
   * Deterministically selects all members of the quorum which
   * has started it's DKG session with the block of this MNList
   * @param {Buffer} selectionModifier
   * @param {number} size
   * @return {SimplifiedMNListEntry[]}
   */
  calculateQuorum(selectionModifier, size) {
    const scores = this.calculateScores(selectionModifier);
    scores.sort((a, b) => Buffer.compare(a.score, b.score));
    scores.reverse();
    return scores.map((score) => score.mn).slice(0, size);
  }

  /**
   * Calculates scores for MN selection
   * it calculates sha256(sha256(proTxHash, confirmedHash), modifier) per MN
   * Please note that this is not a double-sha256 but a single-sha256
   * @param {Buffer} modifier
   * @return {Object[]} scores
   */
  calculateScores(modifier) {
    return this.validMNs
      .filter((mn) => mn.confirmedHash !== constants.NULL_HASH)
      .map((mn) => {
        const bufferWriter = new BufferWriter();
        bufferWriter.writeReverse(mn.confirmedHashWithProRegTxHash());
        bufferWriter.writeReverse(modifier);
        return { score: Hash.sha256(bufferWriter.toBuffer()).reverse(), mn };
      });
  }

  /**
   * Calculates scores for quorum signing selection
   * it calculates sha256(sha256(proTxHash, confirmedHash), modifier) per MN
   * Please note that this is not a double-sha256 but a single-sha256
   * @param {constants.LLMQ_TYPES} llmqType
   * @param {Buffer} modifier
   * @return {Object[]} scores
   */
  calculateSignatoryQuorumScores(llmqType, modifier) {
    // for now we don't care if quorums have been verified or not
    return this.getQuorumsOfType(llmqType).map((quorum, index) => {
      const bufferWriter = new BufferWriter();
      bufferWriter.writeUInt8(llmqType);
      bufferWriter.writeReverse(Buffer.from(quorum.quorumHash, 'hex'));
      bufferWriter.writeReverse(modifier);
      return {
        score: Hash.sha256sha256(bufferWriter.toBuffer()),
        index,
        quorum,
      };
    });
  }

}

/*
 * Expose
 */

module.exports = SimplifiedMNList;
