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
const constants = require('../params/common');

const _ = require('lodash');
//const BufferReader = require('../encoding/bufferreader');
//const BufferWriter = require('../encoding/bufferwriter');
const BufferUtil = require('../../utils/buffer');
const $ = require('../../utils/preconditions');
//const Hash = require('../crypto/hash');
//const constants = require('../constants');
const utils = require('../../utils/js');
const ipUtils = require('../../utils/ip');
//const Address = require('../address');
//const Networks = require('../networks');

const isSha256 = utils.isSha256HexString;
const { isHexStringOfSize } = utils;
const isHexString = utils.isHexaString;
const parseIp = ipUtils.bufferToIPAndPort;
const serializeIp = ipUtils.ipAndPortToBuffer;

const { SHA256_HASH_SIZE } = constants;
const { PUBKEY_ID_SIZE } = constants;
const { BLS_PUBLIC_KEY_SIZE } = constants;

/**
 * @typedef {Object} SMLEntry
 * @property {string} proRegTxHash
 * @property {string} confirmedHash
 * @property {string} service - ip and port
 * @property {string} pubKeyOperator - operator public key
 * @property {string} votingAddress
 * @property {boolean} isValid
 * @property {string} [payoutAddress]
 * @property {string} [operatorPayoutAddress]
 */

/**
 * @class SimplifiedMNListEntry
 * @alias module:primitives.deterministicmnlist.SimplifiedMNListEntry
 * @param {string|Object|Buffer} arg - A Buffer, JSON string, or Object representing a SmlEntry
 * @param {string} [network]
 * @constructor
 * @property {string} proRegTxHash
 * @property {string} confirmedHash
 * @property {string} service - ip and port
 * @property {string} pubKeyOperator - operator public key
 * @property {string} votingAddress
 * @property {boolean} isValid
 * @property {string} [payoutAddress]
 * @property {string} [operatorPayoutAddress]
 */

class SimplifiedMNListEntry {
  /**
   * Create an filter.
   * @constructor
   */

  constructor(arg, network) {
    if (arg) {
      const validNetwork = Networks.get(network);
  
      if (arg instanceof SimplifiedMNListEntry) {
        return arg.copy();
      }
      if (BufferUtil.isBuffer(arg)) {
        return SimplifiedMNListEntry.fromBuffer(arg, validNetwork);
      }
      if (_.isObject(arg)) {
        return SimplifiedMNListEntry.fromObject(arg);
      }
      if (arg instanceof SimplifiedMNListEntry) {
        return arg.copy();
      }
      if (isHexString(arg)) {
        return SimplifiedMNListEntry.fromHexString(arg, validNetwork);
      }
      throw new TypeError('Unrecognized argument for SimplifiedMNListEntry');
    }
  }

  /**
   * Parse buffer and returns SimplifiedMNListEntry
   * @param {Buffer} buffer
   * @param {string} [network]
   * @return {SimplifiedMNListEntry}
   */
  fromBuffer(buffer, network) {
    const bufferReader = new BufferReader(buffer);

    return SimplifiedMNListEntry.fromObject({
      proRegTxHash: bufferReader.read(SHA256_HASH_SIZE).reverse().toString('hex'),
      confirmedHash: bufferReader
        .read(SHA256_HASH_SIZE)
        .reverse()
        .toString('hex'),
      service: parseIp(bufferReader.read(ipUtils.IP_AND_PORT_SIZE)),
      pubKeyOperator: bufferReader.read(BLS_PUBLIC_KEY_SIZE).toString('hex'),
      votingAddress: Address.fromPublicKeyHash(
        bufferReader.read(PUBKEY_ID_SIZE),
        network
      ).toString(),
      isValid: Boolean(bufferReader.readUInt8()),
    });
  }

  /**
   * @param {string} string
   * @param {string} [network]
   * @return {SimplifiedMNListEntry}
   */
  fromHexString(string, network) {
    return SimplifiedMNListEntry.fromBuffer(Buffer.from(string, 'hex'), network);
  }

  /**
   * Serialize SML entry to buffer
   * @return {Buffer}
   */
  toBuffer() {
    this.validate();
    const bufferWriter = new BufferWriter();

    bufferWriter.write(Buffer.from(this.proRegTxHash, 'hex').reverse());
    bufferWriter.write(Buffer.from(this.confirmedHash, 'hex').reverse());
    bufferWriter.write(serializeIp(this.service));
    bufferWriter.write(Buffer.from(this.pubKeyOperator, 'hex'));
    bufferWriter.write(
      Buffer.from(Address.fromString(this.votingAddress).hashBuffer, 'hex')
    );
    bufferWriter.writeUInt8(Number(this.isValid));

    return bufferWriter.toBuffer();
  }

  /**
   * Create SMLEntry from an object
   * @param {SMLEntry} obj
   * @return {SimplifiedMNListEntry}
   */
  fromObject(obj) {
    const SMLEntry = new SimplifiedMNListEntry();
    SMLEntry.proRegTxHash = obj.proRegTxHash;
    SMLEntry.confirmedHash = obj.confirmedHash;
    SMLEntry.service = obj.service;
    SMLEntry.pubKeyOperator = obj.pubKeyOperator;
    SMLEntry.votingAddress = obj.votingAddress;
    SMLEntry.isValid = obj.isValid;
    SMLEntry.payoutAddress = obj.payoutAddress;
    SMLEntry.operatorPayoutAddress = obj.operatorPayoutAddress;
    SMLEntry.network = Address.fromString(obj.votingAddress).network;

    SMLEntry.validate();
    return SMLEntry;
  }

  validate() {
    $.checkArgument(
      isSha256(this.proRegTxHash),
      'Expected proRegTxHash to be a sha256 hex string'
    );
    $.checkArgument(
      isSha256(this.confirmedHash),
      'Expected confirmedHash to be a sha256 hex string'
    );
    if (!ipUtils.isZeroAddress(this.service)) {
      $.checkArgument(
        ipUtils.isIPV4(this.service),
        'Expected service to be a string with ip address and port'
      );
    }
    $.checkArgument(
      isHexStringOfSize(this.pubKeyOperator, BLS_PUBLIC_KEY_SIZE * 2),
      'Expected pubKeyOperator to be a pubkey id'
    );
    $.checkArgument(
      Address.isValid(this.votingAddress),
      'votingAddress is not valid'
    );
    $.checkArgument(
      typeof this.isValid === 'boolean',
      'Expected isValid to be a boolean'
    );
  }

  toObject() {
    const result = {
      proRegTxHash: this.proRegTxHash,
      confirmedHash: this.confirmedHash,
      service: this.service,
      pubKeyOperator: this.pubKeyOperator,
      votingAddress: this.votingAddress,
      isValid: this.isValid,
    };

    if (this.payoutAddress) {
      result.payoutAddress = this.payoutAddress;
    }

    if (this.operatorPayoutAddress) {
      result.operatorPayoutAddress = this.operatorPayoutAddress;
    }

    return result;
  }

  /**
   * @return {Buffer}
   */
  calculateHash() {
    return Hash.sha256sha256(this.toBuffer());
  }

  /**
   * Gets the ip from the service property
   * @return {string}
   */
  getIp() {
    return this.service.split(':')[0];
  }

  /**
   * Serialize confirmed hash with proRegTxHash for MN scores
   * and quorum member selection
   * @return {Buffer}
   */
  confirmedHashWithProRegTxHash() {
    const bufferWriter = new BufferWriter();
    bufferWriter.write(Buffer.from(this.confirmedHash, 'hex'));
    bufferWriter.write(Buffer.from(this.proRegTxHash, 'hex'));
    return Hash.sha256(bufferWriter.toBuffer().reverse()).reverse();
  }

  /**
   * Creates a copy of SimplifiedMNListEntry
   * @return {SimplifiedMNListEntry}
   */
  copy() {
    return SimplifiedMNListEntry.fromBuffer(this.toBuffer(), this.network);
  }

}

/*
 * Expose
 */

module.exports = SimplifiedMNListEntry;
