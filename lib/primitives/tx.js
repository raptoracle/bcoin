/*!
 * tx.js - transaction object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const BN = require('bcrypto/lib/bn');
const bio = require('bufio');
const hash256 = require('bcrypto/lib/hash256');
const secp256k1 = require('bcrypto/lib/secp256k1');
const {BufferSet} = require('buffer-map');
const util = require('../utils/util');
const Amount = require('../units/amount');
const Network = require('../protocol/network');
const TimeData = require('../protocol/timedata');
const Script = require('../script/script');
const Payload = require('./payload');
const Input = require('./input');
const Output = require('./output');
const Outpoint = require('./outpoint');
const InvItem = require('./invitem');
const {consensus, policy, common} = require('../protocol/params');
const ScriptError = require('../script/scripterror');
const {encoding} = bio;
const {hashType} = Script;
const {inspectSymbol} = require('../utils');
const {registeredTransactionNames, registeredTransactionTypes} = common;
const {
  TRANSACTION_NORMAL,
  TRANSACTION_COINBASE,
  TRANSACTION_QUORUM_COMMITMENT,
  TRANSACTION_FUTURE
} = registeredTransactionTypes;

/**
 * TX
 * A static transaction object.
 * @alias module:primitives.TX
 * @property {Number} version
 * @property {Input[]} inputs
 * @property {Output[]} outputs
 * @property {Number} locktime
 */

class TX {
  /**
   * Create a transaction.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    this.time = new TimeData();

    this.version = 1;
    this.inputs = [];
    this.outputs = [];
    this.locktime = 0;
    this.type = 0;
    this.extraPayload = null;

    this.mutable = false;

    this._hash = null;
    this._hhash = null;

    this._raw = null;
    this._offset = -1;
    this._block = false;
    this._size = -1;
    this._sigops = -1;

    this._hashPrevouts = null;
    this._hashSequence = null;
    this._hashOutputs = null;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    assert(options, 'TX data is required.');

    if (options.version != null) {
      assert((options.version >>> 0) === options.version,
        'Version must be a uint32.');
      this.version = options.version;
    }

    if (options.type != null) {
      assert((options.type >>> 0) === options.type,
        'Type must be a uint32.');
      this.type = options.type;

      if(this.type !== TRANSACTION_NORMAL) {
        assert(options.extraPayload, 'Requires a payload if a special tx type');
        this.extraPayload = options.extraPayload;
      }
    }

    if (options.inputs) {
      assert(Array.isArray(options.inputs), 'Inputs must be an array.');
      for (const input of options.inputs)
        this.inputs.push(new Input(input));
    }

    if (options.outputs) {
      assert(Array.isArray(options.outputs), 'Outputs must be an array.');
      for (const output of options.outputs)
        this.outputs.push(new Output(output));
    }

    if (options.locktime != null) {
      assert((options.locktime >>> 0) === options.locktime,
        'Locktime must be a uint32.');
      this.locktime = options.locktime;
    }

    return this;
  }

  /**
   * Instantiate TX from options object.
   * @param {Object} options
   * @returns {TX}
   */

  static fromOptions(options) {
    return new this().fromOptions(options);
  }

  /**
   * Clone the transaction.
   * @returns {TX}
   */

  clone() {
    return new this.constructor().inject(this);
  }

  /**
   * Inject properties from tx.
   * Used for cloning.
   * @private
   * @param {TX} tx
   * @returns {TX}
   */

  inject(tx) {
    this.version = tx.version;
    this.type = tx.type;
    this.extraPayload = tx.extraPayload;

    for (const input of tx.inputs)
      this.inputs.push(input.clone());

    for (const output of tx.outputs)
      this.outputs.push(output.clone());

    this.locktime = tx.locktime;

    return this;
  }

  /**
   * Clear any cached values.
   */

  refresh() {
    this._hash = null;
    this._hhash = null;

    this._raw = null;
    this._size = -1;
    this._offset = -1;
    this._block = false;
    this._sigops = -1;

    this._hashPrevouts = null;
    this._hashSequence = null;
    this._hashOutputs = null;
  }

  /**
   * Hash the transaction with the non-witness serialization.
   * @param {String?} enc - Can be `'hex'` or `null`.
   * @returns {Hash|Buffer} hash
   */

  hash(enc) {
    let h = this._hash;

    if (!h) {
      h = hash256.digest(this.toRaw());
      if (!this.mutable)
        this._hash = h;
    }

    if (enc === 'hex') {
      let hex = this._hhash;
      if (!hex) {
        hex = h.toString('hex');
        if (!this.mutable)
          this._hhash = hex;
      }
      h = hex;
    }

    return h;
  }

  /**
   * Serialize the transaction. Note
   * that this is cached.
   * @returns {Buffer} Serialized transaction.
   */

  toRaw() {
    return this.frame().data;
  }

  /**
   * Write the transaction to a buffer writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw, block) {
    if (this.mutable)
      return this.writeNormal(bw);

    if (block) {
      this._offset = bw.offset;
      this._block = true;
    }

    bw.writeBytes(this.toRaw());

    return bw;
  }

  /**
   * Serialize the transaction. Note
   * that this is cached.
   * @private
   * @returns {RawTX}
   */

  frame() {
    if (this.mutable) {
      assert(!this._raw);
      return this.frameNormal();
    }

    if (this._raw) {
      assert(this._size >= 0);
      const raw = new RawTX(this._size);
      raw.data = this._raw;
      return raw;
    }

    const raw = this.frameNormal();

    this._raw = raw.data;
    this._size = raw.size;

    return raw;
  }

  /**
   * Return the offset and size of the transaction. Useful
   * when the transaction is deserialized within a block.
   * @returns {Object} Contains `size` and `offset`.
   */

  getPosition(height) {
    if(height === 0) {
      return {
        offset: 0,
        size: this._size
      };
    }
    assert(this._block && this._offset > 80, 'Position not available.');

    return {
      offset: this._offset,
      size: this._size
    };
  }

  /**
   * Calculate total size and size of the witness bytes.
   * @returns {Object} Contains `size` and `witness`.
   */

  getSizes() {
    if (this.mutable)
      return this.getNormalSizes();
    return this.frame();
  }

  /**
   * Calculate the real size of the transaction.
   * @returns {Number} size
   */

  getSize() {
    return this.getSizes().size;
  }

  /**
   * Calculate the size of the transaction
   * without the witness.
   * with the witness included.
   * @returns {Number} size
   */

  getBaseSize() {
    const raw = this.getSizes();
    return raw.size;
  }

  /**
   * Get the signature hash of the transaction for signing verifying.
   * @param {Number} index - Index of input being signed/verified.
   * @param {Script} prev - Previous output script or redeem script.
   * @param {Amount} value - Previous output value.
   * @param {SighashType} type - Sighash type.
   * @param {Number} flags - Script flags.
   * @returns {Buffer} Signature hash.
   */

  signatureHash(index, prev, value, type, flags) {
    assert(index >= 0 && index < this.inputs.length);
    assert(prev instanceof Script);
    assert(typeof value === 'number' || typeof value === 'bigint' || typeof value === 'object');
    assert(typeof type === 'number');

    if (flags == null)
      flags = Script.flags.STANDARD_VERIFY_FLAGS;

    return this.signatureHashV0(index, prev, type);
  }

  /**
   * Legacy sighashing -- O(n^2).
   * @private
   * @param {Number} index
   * @param {Script} prev
   * @param {SighashType} type
   * @returns {Buffer}
   */

  signatureHashV0(index, prev, type) {
    if ((type & 0x1f) === hashType.SINGLE) {
      // Bitcoind used to return 1 as an error code:
      // it ended up being treated like a hash.
      if (index >= this.outputs.length) {
        const hash = Buffer.alloc(32, 0x00);
        hash[0] = 0x01;
        return hash;
      }
    }

    // Remove all code separators.
    prev = prev.removeSeparators();

    // Calculate buffer size.
    const size = this.hashSize(index, prev, type);
    const bw = bio.pool(size);

    bw.writeU32(this.version);

    // Serialize inputs.
    if (type & hashType.ANYONECANPAY) {
      // Serialize only the current
      // input if ANYONECANPAY.
      const input = this.inputs[index];

      // Count.
      bw.writeVarint(1);

      // Outpoint.
      input.prevout.toWriter(bw);

      // Replace script with previous
      // output script if current index.
      bw.writeVarBytes(prev.toRaw());
      bw.writeU32(input.sequence);
    } else {
      bw.writeVarint(this.inputs.length);
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];

        // Outpoint.
        input.prevout.toWriter(bw);

        // Replace script with previous
        // output script if current index.
        if (i === index) {
          bw.writeVarBytes(prev.toRaw());
          bw.writeU32(input.sequence);
          continue;
        }

        // Script is null.
        bw.writeVarint(0);

        // Sequences are 0 if NONE or SINGLE.
        switch (type & 0x1f) {
          case hashType.NONE:
          case hashType.SINGLE:
            bw.writeU32(0);
            break;
          default:
            bw.writeU32(input.sequence);
            break;
        }
      }
    }

    // Serialize outputs.
    switch (type & 0x1f) {
      case hashType.NONE: {
        // No outputs if NONE.
        bw.writeVarint(0);
        break;
      }
      case hashType.SINGLE: {
        const output = this.outputs[index];

        // Drop all outputs after the
        // current input index if SINGLE.
        bw.writeVarint(index + 1);

        for (let i = 0; i < index; i++) {
          // Null all outputs not at
          // current input index.
          bw.writeI64(-1);
          bw.writeVarint(0);
        }

        // Regular serialization
        // at current input index.
        output.toWriter(bw);

        break;
      }
      default: {
        // Regular output serialization if ALL.
        bw.writeVarint(this.outputs.length);
        for (const output of this.outputs)
          output.toWriter(bw);
        break;
      }
    }

    bw.writeU32(this.locktime);

    // Append the hash type.
    bw.writeU32(type);

    return hash256.digest(bw.render());
  }

  /**
   * Calculate sighash size.
   * @private
   * @param {Number} index
   * @param {Script} prev
   * @param {Number} type
   * @returns {Number}
   */

  hashSize(index, prev, type) {
    let size = 0;

    size += 4;

    if (type & hashType.ANYONECANPAY) {
      size += 1;
      size += 36;
      size += prev.getVarSize();
      size += 4;
    } else {
      size += encoding.sizeVarint(this.inputs.length);
      size += 41 * (this.inputs.length - 1);
      size += 36;
      size += prev.getVarSize();
      size += 4;
    }

    switch (type & 0x1f) {
      case hashType.NONE:
        size += 1;
        break;
      case hashType.SINGLE:
        size += encoding.sizeVarint(index + 1);
        size += 9 * index;
        size += this.outputs[index].getSize();
        break;
      default:
        size += encoding.sizeVarint(this.outputs.length);
        for (const output of this.outputs)
          size += output.getSize();
        break;
    }

    size += 8;

    return size;
  }

  /**
   * Verify signature.
   * @param {Number} index
   * @param {Script} prev
   * @param {Amount} value
   * @param {Buffer} sig
   * @param {Buffer} key
   * @param {Number} flags
   * @returns {Boolean}
   */

  checksig(index, prev, value, sig, key, flags) {
    if (sig.length === 0)
      return false;

    const type = sig[sig.length - 1];
    const hash = this.signatureHash(index, prev, value, type, flags);

    return secp256k1.verifyDER(hash, sig.slice(0, -1), key);
  }

  /**
   * Create a signature suitable for inserting into scriptSigs.
   * @param {Number} index - Index of input being signed.
   * @param {Script} prev - Previous output script or redeem script.
   * @param {Amount} value - Previous output value.
   * @param {Buffer} key
   * @param {SighashType} type
   * @param {Number} flags - Script flags.
   * @returns {Buffer} Signature in DER format.
   */

  signature(index, prev, value, key, type, flags) {
    if (type == null)
      type = hashType.ALL;

    if (flags == null)
      flags = Script.flags.VERIFY_SIGHASH_FORKID;

    const hash = this.signatureHash(index, prev, value, type, flags);
    const sig = secp256k1.signDER(hash, key);
    const bw = bio.write(sig.length + 1);

    bw.writeBytes(sig);
    bw.writeU8(type);

    return bw.render();
  }

  /**
   * Verify all transaction inputs.
   * @param {CoinView} view
   * @param {VerifyFlags?} [flags=STANDARD_VERIFY_FLAGS]
   * @throws {ScriptError} on invalid inputs
   */

  check(view, flags) {
    return this.checkNormal(view, flags);
  }

  checkNormal(view, flags) {
    for (let i = 0; i < this.inputs.length; i++) {
      const {prevout} = this.inputs[i];
      const coin = view.getOutput(prevout);

      if (!coin)
        throw new ScriptError('UNKNOWN_ERROR', 'No coin available.');

      this.checkInput(i, coin, flags);
    }
  }

  /**
   * Verify a transaction input.
   * @param {Number} index - Index of output being
   * verified.
   * @param {Coin|Output} coin - Previous output.
   * @param {VerifyFlags} [flags=STANDARD_VERIFY_FLAGS]
   * @throws {ScriptError} on invalid input
   */

  checkInput(index, coin, flags) {
    const input = this.inputs[index];

    assert(input, 'Input does not exist.');
    assert(coin, 'No coin passed.');

    Script.verify(
      input.script,
      null,
      coin.script,
      this,
      index,
      coin.value,
      flags
    );
  }

  /**
   * Verify the transaction inputs on the worker pool
   * (if workers are enabled).
   * @param {CoinView} view
   * @param {VerifyFlags?} [flags=STANDARD_VERIFY_FLAGS]
   * @param {WorkerPool?} pool
   * @returns {Promise}
   */

  async checkAsync(view, flags, pool) {
    //if (!this.isQuorumCommitment() && this.inputs.length === 0)
    //  throw new ScriptError('UNKNOWN_ERROR', 'No inputs.');

    if (!pool) {
      this.check(view, flags);
      return;
    }

    await pool.check(this, view, flags);
  }

  /**
   * Verify a transaction input asynchronously.
   * @param {Number} index - Index of output being
   * verified.
   * @param {Coin|Output} coin - Previous output.
   * @param {VerifyFlags} [flags=STANDARD_VERIFY_FLAGS]
   * @param {WorkerPool?} pool
   * @returns {Promise}
   */

  async checkInputAsync(index, coin, flags, pool) {
    const input = this.inputs[index];

    assert(input, 'Input does not exist.');
    assert(coin, 'No coin passed.');

    if (!pool) {
      this.checkInput(index, coin, flags);
      return;
    }

    await pool.checkInput(this, index, coin, flags);
  }

  /**
   * Verify all transaction inputs.
   * @param {CoinView} view
   * @param {VerifyFlags?} [flags=STANDARD_VERIFY_FLAGS]
   * @returns {Boolean} Whether the inputs are valid.
   */

  verify(view, flags) {
    try {
      this.check(view, flags);
    } catch (e) {
      if (e.type === 'ScriptError')
        return false;
      throw e;
    }
    return true;
  }

  /**
   * Verify a transaction input.
   * @param {Number} index - Index of output being
   * verified.
   * @param {Coin|Output} coin - Previous output.
   * @param {VerifyFlags} [flags=STANDARD_VERIFY_FLAGS]
   * @returns {Boolean} Whether the input is valid.
   */

  verifyInput(index, coin, flags) {
    try {
      this.checkInput(index, coin, flags);
    } catch (e) {
      if (e.type === 'ScriptError')
        return false;
      throw e;
    }
    return true;
  }

  /**
   * Verify the transaction inputs on the worker pool
   * (if workers are enabled).
   * @param {CoinView} view
   * @param {VerifyFlags?} [flags=STANDARD_VERIFY_FLAGS]
   * @param {WorkerPool?} pool
   * @returns {Promise}
   */

  async verifyAsync(view, flags, pool) {
    try {
      await this.checkAsync(view, flags, pool);
    } catch (e) {
      if (e.type === 'ScriptError')
        return false;
      throw e;
    }
    return true;
  }

  /**
   * Verify a transaction input asynchronously.
   * @param {Number} index - Index of output being
   * verified.
   * @param {Coin|Output} coin - Previous output.
   * @param {VerifyFlags} [flags=STANDARD_VERIFY_FLAGS]
   * @param {WorkerPool?} pool
   * @returns {Promise}
   */

  async verifyInputAsync(index, coin, flags, pool) {
    try {
      await this.checkInput(index, coin, flags, pool);
    } catch (e) {
      if (e.type === 'ScriptError')
        return false;
      throw e;
    }
    return true;
  }

  /**
   * Test whether the transaction is a coinbase
   * by examining the inputs.
   * @returns {Boolean}
   */

  isCoinbase() {
    return this.inputs.length === 1 && this.inputs[0].prevout.isNull();
  }

  isQuorumCommitment() {
    return this.type === TRANSACTION_QUORUM_COMMITMENT;
  }

  /**
   * Test whether the transaction is replaceable.
   * @returns {Boolean}
   */

  isRBF() {
    // Core doesn't do this, but it should:
    if (this.version === 2)
      return false;

    for (const input of this.inputs) {
      if (input.isRBF())
        return true;
    }

    return false;
  }

  /**
   * Calculate the fee for the transaction.
   * @param {CoinView} view
   * @returns {Amount} fee (zero if not all coins are available).
   */

  getFee(view) {
    if (!this.hasCoins(view))
      return 0;

    return this.getInputValue(view) - this.getOutputValue();
  }

  /**
   * Calculate the total input value.
   * @param {CoinView} view
   * @returns {Amount} value
   */

  getInputValue(view) {
    let total = new BN(0);

    for (const {prevout} of this.inputs) {
      const coin = view.getOutput(prevout);

      if (!coin)
        return 0;

      //total += BigInt(coin.value);
      let cv = new BN(coin.value);
      total.iadd(cv);
    }

    return total;
  }

  /**
   * Calculate the total output value.
   * @returns {Amount} value
   */

  getOutputValue() {
    let total = new BN(0);

    for (const output of this.outputs) {
      //total += BigInt(output.value);
      let ov = new BN(output.value);
      total.iadd(ov);
    }

    return total;
  }

  /**
   * Get all input addresses.
   * @private
   * @param {CoinView} view
   * @returns {Array} [addrs, table]
   */

  _getInputAddresses(view) {
    const table = new BufferSet();
    const iAddrs = [];
    const iValues = [];

    if (this.isCoinbase())
      return [iAddrs, table, iValues];

    for (const input of this.inputs) {
      const coin = view ? view.getOutputFor(input) : null;
      const addr = input.getAddress(coin);

      if (!addr)
        continue;

      const hash = addr.getHash();
      const value = new BN(coin.value).toNumber();

      if (!table.has(hash)) {
        table.add(hash);
        iAddrs.push(addr);
        iValues[addr] += value;
      }
    }

    return [iAddrs, table, iValues];
  }

  /**
   * Get all output addresses.
   * @private
   * @returns {Array} [addrs, table]
   */

  _getOutputAddresses() {
    const table = new BufferSet();
    const oAddrs = [];
    const values = [];

    for (const output of this.outputs) {
      const addr = output.getAddress();

      if (!addr)
        continue;

      const hash = addr.getHash();
      const value = new BN(output.value).toNumber();

      if (!table.has(hash)) {
        table.add(hash);
        oAddrs.push(addr);
        values[addr] += value;
      }
    }

    return [oAddrs, table, values];
  }

  /**
   * Get all addresses.
   * @private
   * @param {CoinView} view
   * @returns {Array} [addrs, table]
   */

  _getAddresses(view) {
    const [iAddrs, table, iValues] = this._getInputAddresses(view);
    const output = this.getOutputAddresses();

    for (const addr of output) {
      const hash = addr.getHash();

      if (!table.has(hash)) {
        table.add(hash);
        iAddrs.push(addr);
      }
    }

    return [addrs, table];
  }

  /**
   * Get all input addresses.
   * @param {CoinView|null} view
   * @returns {Address[]} addresses
   */

  getInputAddresses(view) {
    const [addrs] = this._getInputAddresses(view);
    return addrs;
  }

  /**
   * Get all output addresses.
   * @returns {Address[]} addresses
   */

  getOutputAddresses() {
    const [addrs] = this._getOutputAddresses();
    return addrs;
  }

  /**
   * Get all addresses.
   * @param {CoinView|null} view
   * @returns {Address[]} addresses
   */

  getAddresses(view) {
    const [addrs] = this._getAddresses(view);
    return addrs;
  }

  /**
   * Get all input address hashes.
   * @param {CoinView|null} view
   * @param {String?} enc - Encoding, can be `'hex'` or null.
   * @returns {Hash[]} hashes
   */

  getInputHashes(view, enc) {
    const [, table] = this._getInputAddresses(view);

    if (enc !== 'hex')
      return table.toArray();

    return table.toArray().map(h => h.toString('hex'));
  }

  /**
   * Get all output address hashes.
   * @returns {Hash[]} hashes
   */

  getOutputHashes(enc) {
    const [, table] = this._getOutputAddresses();

    if (enc !== 'hex')
      return table.toArray();

    return table.toArray().map(h => h.toString('hex'));
  }

  /**
   * Get all address hashes.
   * @param {CoinView|null} view
   * @param {String?} enc - Encoding, can be `'hex'` or null.
   * @returns {Hash[]} hashes
   */

  getHashes(view, enc) {
    const [, table] = this._getAddresses(view);

    if (enc !== 'hex')
      return table.toArray();

    return table.toArray().map(h => h.toString('hex'));
  }

  /**
   * Test whether the transaction has
   * all coins available.
   * @param {CoinView} view
   * @returns {Boolean}
   */

  hasCoins(view) {
    if (this.inputs.length === 0)
      return false;

    for (const {prevout} of this.inputs) {
      if (!view.hasEntry(prevout))
        return false;
    }

    return true;
  }

  /**
   * Check finality of transaction by examining
   * nLocktime and nSequence values.
   * @example
   * tx.isFinal(chain.height + 1, network.now());
   * @param {Number} height - Height at which to test. This
   * is usually the chain height, or the chain height + 1
   * when the transaction entered the mempool.
   * @param {Number} time - Time at which to test. This is
   * usually the chain tip's parent's median time, or the
   * time at which the transaction entered the mempool. If
   * MEDIAN_TIME_PAST is enabled this will be the median
   * time of the chain tip's previous entry's median time.
   * @returns {Boolean}
   */

  isFinal(height, time) {
    const THRESHOLD = consensus.LOCKTIME_THRESHOLD;

    if (this.locktime === 0)
      return true;

    if (this.locktime < (this.locktime < THRESHOLD ? height : time))
      return true;

    for (const input of this.inputs) {
      if (input.sequence !== consensus.SEQUENCE_FINAL)
        return false;
    }

    return true;
  }

  /**
   * Verify the absolute locktime of a transaction.
   * Called by OP_CHECKLOCKTIMEVERIFY.
   * @param {Number} index - Index of input being verified.
   * @param {Number} predicate - Locktime to verify against.
   * @returns {Boolean}
   */

  verifyLocktime(index, predicate) {
    const THRESHOLD = consensus.LOCKTIME_THRESHOLD;
    const input = this.inputs[index];

    assert(input, 'Input does not exist.');
    assert(predicate >= 0, 'Locktime must be non-negative.');

    // Locktimes must be of the same type (blocks or seconds).
    if ((this.locktime < THRESHOLD) !== (predicate < THRESHOLD))
      return false;

    if (predicate > this.locktime)
      return false;

    if (input.sequence === 0xffffffff)
      return false;

    return true;
  }

  /**
   * Verify the relative locktime of an input.
   * Called by OP_CHECKSEQUENCEVERIFY.
   * @param {Number} index - Index of input being verified.
   * @param {Number} predicate - Relative locktime to verify against.
   * @returns {Boolean}
   */

  verifySequence(index, predicate) {
    const DISABLE_FLAG = consensus.SEQUENCE_DISABLE_FLAG;
    const TYPE_FLAG = consensus.SEQUENCE_TYPE_FLAG;
    const MASK = consensus.SEQUENCE_MASK;
    const input = this.inputs[index];

    assert(input, 'Input does not exist.');
    assert(predicate >= 0, 'Locktime must be non-negative.');

    // For future softfork capability.
    if (predicate & DISABLE_FLAG)
      return true;

    // Version must be >=2.
    if (this.version < 2)
      return false;

    // Cannot use the disable flag without
    // the predicate also having the disable
    // flag (for future softfork capability).
    if (input.sequence & DISABLE_FLAG)
      return false;

    // Locktimes must be of the same type (blocks or seconds).
    if ((input.sequence & TYPE_FLAG) !== (predicate & TYPE_FLAG))
      return false;

    if ((predicate & MASK) > (input.sequence & MASK))
      return false;

    return true;
  }

  /**
   * Calculate legacy (inaccurate) sigop count.
   * @returns {Number} sigop count
   */

  getLegacySigops() {
    if (this._sigops !== -1)
      return this._sigops;

    let total = 0;

    for (const input of this.inputs)
      total += input.script.getSigops(false);

    for (const output of this.outputs)
      total += output.script.getSigops(false);

    if (!this.mutable)
      this._sigops = total;

    return total;
  }

  /**
   * Calculate accurate sigop count, taking into account redeem scripts.
   * @param {CoinView} view
   * @param {VerifyFlags} flags
   * @returns {Number} sigop count
   */

  getScripthashSigops(view, flags) {
    if (this.isCoinbase())
      return 0;

    let total = 0;

    for (const input of this.inputs) {
      const coin = view.getOutputFor(input);

      if (!coin)
        continue;

      if (!coin.script.isScripthash())
        continue;

      total += coin.script.getScripthashSigops(input.script, flags);
    }

    return total;
  }

  /**
   * Calculate sigops count.
   * @param {CoinView} view
   * @param {VerifyFlags?} flags
   * @returns {Number} sigop count
   */

  getSigopsCount(view, flags) {
    if (flags === null)
      flags = Script.flags.STANDARD_VERIFY_FLAGS;

    let cost = this.getLegacySigops();

    if (flags & Script.flags.VERIFY_P2SH)
      cost += this.getScripthashSigops(view, flags);

    return cost;
  }

  /**
   * Calculate sigop count.
   * @param {CoinView} view
   * @param {VerifyFlags?} flags
   * @returns {Number} sigop count
   */

  getSigops(view, flags) {
    return this.getSigopsCount(view, flags);
  }

  /**
   * Non-contextual sanity checks for the transaction.
   * Will mostly verify coin and output values.
   * @see CheckTransaction()
   * @returns {Array} [result, reason, score]
   */

  isSane() {
    const [valid] = this.checkSanity();
    return valid;
  }

  /**
   * Non-contextual sanity checks for the transaction.
   * Will mostly verify coin and output values.
   * @see CheckTransaction()
   * @returns {Array} [valid, reason, score]
   */

  checkSanity() {
    if (!this.isQuorumCommitment() && this.inputs.length === 0)
      return [false, 'bad-txns-vin-empty', 100];

    if (!this.isQuorumCommitment() && this.outputs.length === 0)
      return [false, 'bad-txns-vout-empty', 100];

    if (this.getSize() > consensus.MAX_BLOCK_SIZE)
      return [false, 'bad-txns-oversize', 100];

    if(this.isSpecialTransaction()) {
      if(this.getExtraPayloadSize() > consensus.MAX_TX_EXTRA_PAYLOAD)
        return [false, 'bad-txns-payload-oversize', 100];
    }

    let total = new BN(0);

    for (const output of this.outputs) {
      let ov = new BN(output.value);
      if (ov.isNeg())
        return [false, 'bad-txns-vout-negative', 100];

      if (!consensus.moneyRange(ov))
        return [false, 'bad-txns-vout-toolarge', 100];

      //total += output.value;
      total.iadd(ov);

      if (!consensus.moneyRange(total))
        return [false, 'bad-txns-txouttotal-toolarge', 100];
    }

    const prevout = new BufferSet();

    for (const input of this.inputs) {
      const key = input.prevout.toKey();

      if (prevout.has(key))
        return [false, 'bad-txns-inputs-duplicate', 100];

      prevout.add(key);
    }

    if (this.isCoinbase()) {
      let minCbSize = 2;
      if(this.type === TRANSACTION_COINBASE) {
        minCbSize = 1;
      }
      const size = this.inputs[0].script.getSize();
      if (size < minCbSize || size > 100)
        return [false, 'bad-cb-length', 100];
    } else {
      for (const input of this.inputs) {
        if (input.prevout.isNull())
          return [false, 'bad-txns-prevout-null', 10];
      }
    }

    return [true, 'valid', 0];
  }

  /**
   * Non-contextual checks to determine whether the
   * transaction has all standard output script
   * types and standard input script size with only
   * pushdatas in the code.
   * Will mostly verify coin and output values.
   * @see IsStandardTx()
   * @returns {Array} [valid, reason, score]
   */

  isStandard() {
    const [valid] = this.checkStandard();
    return valid;
  }

  /**
   * Non-contextual checks to determine whether the
   * transaction has all standard output script
   * types and standard input script size with only
   * pushdatas in the code.
   * Will mostly verify coin and output values.
   * @see IsStandardTx()
   * @returns {Array} [valid, reason, score]
   */

  checkStandard() {
    if (this.version < 1 || this.version > policy.MAX_TX_VERSION)
      return [false, 'version', 0];

      if (this.getSize() >= policy.MAX_TX_SIZE)
      return [false, 'tx-size', 0];

    for (const input of this.inputs) {
      if (input.script.getSize() > 1650)
        return [false, 'scriptsig-size', 0];

      if (!input.script.isPushOnly())
        return [false, 'scriptsig-not-pushonly', 0];
    }

    let nulldata = 0;

    for (const output of this.outputs) {
      if (!output.script.isStandard())
        return [false, 'scriptpubkey', 0];

      if (output.script.isNulldata()) {
        nulldata++;
        continue;
      }

      if (output.script.isMultisig() && !policy.BARE_MULTISIG)
        return [false, 'bare-multisig', 0];

      if (output.isDust(policy.MIN_RELAY))
        return [false, 'dust', 0];
    }

    if (nulldata > 1)
      return [false, 'multi-op-return', 0];

    return [true, 'valid', 0];
  }

  /**
   * Perform contextual checks to verify coin and input
   * script standardness (including the redeem script).
   * @see AreInputsStandard()
   * @param {CoinView} view
   * @returns {Boolean}
   */

  hasStandardInputs(view) {
    if (this.isCoinbase())
      return true;

    for (const input of this.inputs) {
      const coin = view.getOutputFor(input);

      if (!coin)
        return false;

      if (coin.script.isPubkeyhash())
        continue;

      if (coin.script.isScripthash()) {
        const redeem = input.script.getRedeem();

        if (!redeem)
          return false;

        if (redeem.getSigops(true) > policy.MAX_P2SH_SIGOPS)
          return false;

        continue;
      }

      if (coin.script.isUnknown())
        return false;
    }

    return true;
  }

  /**
   * Perform contextual checks to verify input, output,
   * and fee values, as well as coinbase spend maturity
   * (coinbases can only be spent 100 blocks or more
   * after they're created). Note that this function is
   * consensus critical.
   * @param {CoinView} view
   * @param {Number} height - Height at which the
   * transaction is being spent. In the mempool this is
   * the chain height plus one at the time it entered the pool.
   * @returns {Boolean}
   */

  verifyInputs(view, height) {
    const [fee] = this.checkInputs(view, height);
    return fee !== -1;
  }

  /**
   * Perform contextual checks to verify input, output,
   * and fee values, as well as coinbase spend maturity
   * (coinbases can only be spent 100 blocks or more
   * after they're created). Note that this function is
   * consensus critical.
   * @param {CoinView} view
   * @param {Number} height - Height at which the
   * transaction is being spent. In the mempool this is
   * the chain height plus one at the time it entered the pool.
   * @returns {Array} [fee, reason, score]
   */

  checkInputs(view, height) {
    assert(typeof height === 'number');

    let total = new BN(0);

    for (const {prevout} of this.inputs) {
      const entry = view.getEntry(prevout);

      // are the actual inputs available?
      if (!entry)
        return [-1, 'bad-txns-inputs-missingorspent', 0];

      // If prev is coinbase, check that it's matured
      if (entry.coinbase && height - entry.height < consensus.COINBASE_MATURITY)
        return [-1, 'bad-txns-premature-spend-of-coinbase', 0];

      const coin = view.getOutput(prevout);
      assert(coin);

      // Check for negative or overflow input values
      //total += BigInt(coin.value);
      let cv = new BN(coin.value.toString(10));
      total.iadd(cv);

      //if (total < 0 || total > consensus.MAX_MONEY)
      if(!consensus.moneyRange(cv) || !consensus.moneyRange(total))
        return [-1, 'bad-txns-inputvalues-outofrange', 100];

      const futureValidationError = this.validateFutureCoin(entry, height);
      if(futureValidationError)
        return [-1, futureValidationError, 100];
    }

    // Overflows already checked in `isSane()`.
    const value = new BN(this.getOutputValue());

    if (total.lt(value))
      return [-1, 'bad-txns-in-belowout', 100];

    let fee = new BN(total);
    fee.isub(value);

    //const fee = total - value;

    if(!consensus.moneyRange(fee))
      return [-1, 'bad-txns-fee-outofrange', 100];

    if(!this.checkSpecialTxFee(fee))
      return [-1, 'bad-txns-wrong-future-fee-or-not-enable', 100];

    //if (fee < 0)
    if (fee.isNeg())
      return [-1, 'bad-txns-fee-too-low', 100];

    return [fee, 'valid', 0];
  }

  validateFutureCoin(coin, spendHeight) {
    if(coin.type === TRANSACTION_FUTURE) {
      assert(this.extraPayload, 'Need the block the tx is on for future tx validation');
      let adjustCurrentTime = this.time.now();
      let confirmedTime = coin.time;
      let futureTx = Payload.serializeToJSON(this.extraPayload);
      if(!!futureTx) {
        let isBlockMature = futureTx.maturity >= 0 && spendHeight - coin.height >= futureTx.maturity;
        let isTimeMature = futureTx.lockTime >= 0 && adjustCurrentTime - confirmedTime >= futureTx.lockTime;
        let canSpend = isBlockMature || isTimeMature;
        if(!canSpend) {
          return "bad-txns-premature-spend-of-future";
        }
        return;
      }
      return "bad-txns-unable-to-parse-future";
    }
    return;
  }

  checkSpecialTxFee(fee) {
    let nFeeTotal, specialTxFee;
    if(this.version >= 3) {
      switch(this.type) {
        case TRANSACTION_FUTURE:
          let ftx = Payload.serializeToJSON(this.extraPayload);
          if(!!ftx) {
            specialTxFee = ftx.fee * consensus.COIN;
            nFeeTotal -= specialTxFee;
          }
          break;
      }
    }
    return true;
  }

  /**
   * Calculate the modified size of the transaction. This
   * is used in the mempool for calculating priority.
   * @param {Number?} size - The size to modify. If not present,
   * virtual size will be used.
   * @returns {Number} Modified size.
   */

  getModifiedSize(size) {
    if (size == null)
      size = this.getSize();

    for (const input of this.inputs) {
      const offset = 41 + Math.min(110, input.script.getSize());
      if (size > offset)
        size -= offset;
    }

    return size;
  }

  /**
   * Calculate the transaction priority.
   * @param {CoinView} view
   * @param {Number} height
   * @param {Number?} size - Size to calculate priority
   * based on. If not present, virtual size will be used.
   * @returns {Number}
   */

  getPriority(view, height, size) {
    assert(typeof height === 'number', 'Must pass in height.');

    if (this.isCoinbase())
      return 0;

    if (size == null)
      size = this.getSize();

    let sum = new BN(0);

    for (const {prevout} of this.inputs) {
      const coin = view.getOutput(prevout);

      if (!coin)
        continue;

      const coinHeight = view.getHeight(prevout);

      if (coinHeight === -1)
        continue;

      if (coinHeight <= height) {
        const age = height - coinHeight;
        let cv = new BN(coin.value);
        //sum += BigInt(coin.value) * BigInt(age);
        sum.iadd(cv).imuln(age);
      }
    }

    let ss = sum.idivn(size).toBigInt();

    //return Math.floor(ss);
    return ss;
  }

  /**
   * Calculate the transaction's on-chain value.
   * @param {CoinView} view
   * @returns {Number}
   */

  getChainValue(view) {
    if (this.isCoinbase())
      return new BN(0);

    let value = new BN(0);

    for (const {prevout} of this.inputs) {
      const coin = view.getOutput(prevout);

      if (!coin)
        continue;

      const height = view.getHeight(prevout);

      if (height === -1)
        continue;

      //value += BigInt(coin.value);
      let cv = new BN(coin.value);
      value.iadd(cv);
    }

    return value;
  }

  /**
   * Determine whether the transaction is above the
   * free threshold in priority. A transaction which
   * passed this test is most likely relayable
   * without a fee.
   * @param {CoinView} view
   * @param {Number?} height - If not present, tx
   * height or network height will be used.
   * @param {Number?} size - If not present, modified
   * size will be calculated and used.
   * @returns {Boolean}
   */

  isFree(view, height, size) {
    const priority = this.getPriority(view, height, size);
    return priority > policy.FREE_THRESHOLD;
  }

  /**
   * Calculate minimum fee in order for the transaction
   * to be relayable (not the constant min relay fee).
   * @param {Number?} size - If not present, max size
   * estimation will be calculated and used.
   * @param {Rate?} rate - Rate of satoshi per kB.
   * @returns {Amount} fee
   */

  getMinFee(size, rate) {
    if (size == null)
      size = this.getSize();

    return policy.getMinFee(size, rate);
  }

  /**
   * Calculate the minimum fee in order for the transaction
   * to be relayable, but _round to the nearest kilobyte
   * when taking into account size.
   * @param {Number?} size - If not present, max size
   * estimation will be calculated and used.
   * @param {Rate?} rate - Rate of satoshi per kB.
   * @returns {Amount} fee
   */

  getRoundFee(size, rate) {
    if (size == null)
      size = this.getSize();

    return policy.getRoundFee(size, rate);
  }

  /**
   * Calculate the transaction's rate based on size
   * and fees. Size will be calculated if not present.
   * @param {CoinView} view
   * @param {Number?} size
   * @returns {Rate}
   */

  getRate(view, size) {
    const fee = this.getFee(view);

    if (fee < 0)
      return 0;

    if (size == null)
      size = this.getSize();

    return policy.getRate(size, fee);
  }

  /**
   * Get all unique outpoint hashes.
   * @returns {Hash[]} Outpoint hashes.
   */

  getPrevout() {
    if (this.isCoinbase())
      return [];

    const prevout = new BufferSet();

    for (const input of this.inputs)
      prevout.add(input.prevout.hash);

    return prevout.toArray();
  }

  /**
   * Test a transaction against a bloom filter using
   * the BIP37 matching algorithm. Note that this may
   * update the filter depending on what the `update`
   * value is.
   * @see "Filter matching algorithm":
   * @see https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki
   * @param {BloomFilter} filter
   * @returns {Boolean} True if the transaction matched.
   */

  isWatched(filter) {
    let found = false;

    // 1. Test the tx hash
    if (filter.test(this.hash()))
      found = true;

    // 2. Test data elements in output scripts
    //    (may need to update filter on match)
    for (let i = 0; i < this.outputs.length; i++) {
      const output = this.outputs[i];
      // Test the output script
      if (output.script.test(filter)) {
        if (filter.update === 1 /* ALL */) {
          const prevout = Outpoint.fromTX(this, i);
          filter.add(prevout.toRaw());
        } else if (filter.update === 2 /* PUBKEY_ONLY */) {
          if (output.script.isPubkey() || output.script.isMultisig()) {
            const prevout = Outpoint.fromTX(this, i);
            filter.add(prevout.toRaw());
          }
        }
        found = true;
      }
    }

    if (found)
      return found;

    // 3. Test prev_out structure
    // 4. Test data elements in input scripts
    for (const input of this.inputs) {
      const prevout = input.prevout;

      // Test the COutPoint structure
      if (filter.test(prevout.toRaw()))
        return true;

      // Test the input script
      if (input.script.test(filter))
        return true;
    }

    // 5. No match
    return false;
  }

  /**
   * Get little-endian tx hash.
   * @returns {Hash}
   */

  rhash() {
    return util.revHex(this.hash());
  }

  /**
   * Get little-endian tx hash.
   * @returns {Hash}
   */

  txid() {
    return this.rhash();
  }

  /**
   * Convert the tx to an inv item.
   * @returns {InvItem}
   */

  toInv() {
    return new InvItem(InvItem.types.TX, this.hash());
  }

  /**
   * Inspect the transaction and return a more
   * user-friendly representation of the data.
   * @returns {Object}
   */

  [inspectSymbol]() {
    return this.format();
  }

  /**
   * Inspect the transaction and return a more
   * user-friendly representation of the data.
   * @param {CoinView} view
   * @param {ChainEntry} entry
   * @param {Number} index
   * @returns {Object}
   */

  format(view, entry, index) {
    let rate = 0;
    let fee = 0;
    let height = -1;
    let block = null;
    let time = 0;
    let date = null;

    if (view) {
      fee = this.getFee(view);
      rate = this.getRate(view);

      // Rate can exceed 53 bits in testing.
      if (!Number.isSafeInteger(rate))
        rate = 0;
    }

    if (entry) {
      height = entry.height;
      block = util.revHex(entry.hash);
      time = entry.time;
      date = util.date(time);
    }

    if (index == null)
      index = -1;

    const specialTxObject = this.isSpecialTransaction() ? {
      extraPayloadSize: this.getExtraPayloadSize(),
      extraPayload: this.extraPayload.toString("hex"),
      [registeredTransactionNames[this.type]]: Payload.serializeToJSON(this.extraPayload),
    } : null;

    const txObject = {
      hash: this.txid(),
      size: this.getSize(),
      value: new BN(this.getOutputValue()).toNumber(),
      fee: fee,
      rate: rate,
      minFee: this.getMinFee(),
      height: height,
      block: block,
      time: time,
      date: date,
      index: index,
      version: this.version,
      type: this.type,
      inputs: this.inputs.map((input) => {
        const coin = view ? view.getOutputFor(input) : null;
        return input.format(coin);
      }),
      outputs: this.outputs,
      ...specialTxObject,
      locktime: this.locktime,
      hex: this.toRaw().toString('hex'),
    };
    return txObject;
  }

  /**
   * Convert the transaction to an object suitable
   * for JSON serialization.
   * @returns {Object}
   */

  toJSON() {
    return this.getJSON();
  }

  /**
   * Convert the transaction to an object suitable
   * for JSON serialization. Note that the hashes
   * will be reversed to abide by bitcoind's legacy
   * of little-endian uint256s.
   * @param {Network} network
   * @param {CoinView} view
   * @param {ChainEntry} entry
   * @param {Number} index
   * @returns {Object}
   */

  getJSON(network, view, entry, index) {
    let rate, fee, height, block, time, date;

    if (view) {
      fee = this.getFee(view);
      rate = this.getRate(view);

      // Rate can exceed 53 bits in testing.
      if (!Number.isSafeInteger(rate))
        rate = 0;
    }

    if (entry) {
      height = entry.height;
      block = util.revHex(entry.hash);
      time = entry.time;
      date = util.date(time);
    }

    network = Network.get(network);

    const specialTxObject = this.isSpecialTransaction() ? {
      extraPayloadSize: this.getExtraPayloadSize(),
      extraPayload: this.extraPayload,
      [registeredTransactionNames[this.type]]: Payload.serializeToJSON(this.extraPayload),
    } : null;

    const txObject = {
      hash: this.txid(),
      fee: fee,
      rate: rate,
      mtime: util.now(),
      height: height,
      block: block,
      time: time,
      date: date,
      index: index,
      version: this.version,
      type: this.type,
      inputs: this.inputs.map((input) => {
        const coin = view ? view.getCoinFor(input) : null;
        return input.getJSON(network, coin);
      }),
      outputs: this.outputs.map((output) => {
        return output.getJSON(network);
      }),
      ...specialTxObject,
      locktime: this.locktime,
      hex: this.toRaw().toString('hex')
    };

    return txObject;
  }

  /**
   * Inject properties from a json object.
   * @private
   * @param {Object} json
   */

  fromJSON(json) {
    assert(json, 'TX data is required.');
    assert((json.version >>> 0) === json.version, 'Version must be a uint32.');
    assert(Array.isArray(json.inputs), 'Inputs must be an array.');
    assert(Array.isArray(json.outputs), 'Outputs must be an array.');
    assert((json.locktime >>> 0) === json.locktime,
      'Locktime must be a uint32.');

    this.version = json.version;
    this.type = json.type;

    for (const input of json.inputs)
      this.inputs.push(Input.fromJSON(input));

    for (const output of json.outputs)
      this.outputs.push(Output.fromJSON(output));

    this.extraPayload = json.extraPayload;

    this.locktime = json.locktime;

    return this;
  }

  /**
   * Instantiate a transaction from a
   * jsonified transaction object.
   * @param {Object} json - The jsonified transaction object.
   * @returns {TX}
   */

  static fromJSON(json) {
    return new this().fromJSON(json);
  }

  /**
   * Instantiate a transaction from a serialized Buffer.
   * @param {Buffer} data
   * @param {String?} enc - Encoding, can be `'hex'` or null.
   * @returns {TX}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }

  /**
   * Instantiate a transaction from a buffer reader.
   * @param {BufferReader} br
   * @param {Boolean} block
   * @returns {TX}
   */

  static fromReader(br, block) {
    //const start = br.offset;
    //br.end();
    //br.offset = start;
    return new this().fromLegacyReader(br, block);
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    return this.fromReader(bio.read(data));
  }

  /**
   * Instantiate a transaction from a buffer reader.
   * @param {BufferReader} br
   * @param {Boolean} block
   * @returns {TX}
   */

  fromReader(br, block) {
    //const start = br.offset;
    // Clear misinterpreted witness format data
    //this.inputs.length = 0;
    //this.outputs.length = 0;

    // Reset BufferReader and try again with legacy format
    //br.end();
    //br.offset = start;
    return this.fromLegacyReader(br, block);
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   * @param {Boolean} block
   */

  fromLegacyReader(br, block) {
    const start = br.start();

    let n32bitVersion = br.readU32();
    this.version = n32bitVersion & 0xffff;
    this.type = (n32bitVersion >> 16) & 0xffff;

    const inCount = br.readVarint();

    for (let i = 0; i < inCount; i++)
      this.inputs.push(Input.fromReader(br));

    const outCount = br.readVarint();

    for (let i = 0; i < outCount; i++)
      this.outputs.push(Output.fromReader(br));

    this.locktime = br.readU32();

    if (this.isSpecialTransaction() && !br.finished()) {
      const extraPayloadSize = br.readVarint();
      if (extraPayloadSize > 0) {
        var payloadBuffer = br.readBytes(extraPayloadSize);
        this.setExtraPayload(Payload.parseBuffer(this.type, payloadBuffer));
      }
    }

    if (block) {
      this._offset = start;
      this._block = true;
    }

    if (!this.mutable) {
      this._raw = br.endData();
      this._size = this._raw.length;
    } else {
      br.end();
    }

    return this;
  }

  /**
   * Serialize transaction without witness.
   * @private
   * @returns {RawTX}
   */

  frameNormal() {
    const raw = this.getNormalSizes();
    const bw = bio.write(raw.size);
    this.writeNormal(bw);
    raw.data = bw.render();
    return raw;
  }

  /**
   * Serialize transaction
   * @private
   * @param {BufferWriter} bw
   * @returns {RawTX}
   */

  writeNormal(bw) {
    if (this.inputs.length === 0 && this.outputs.length !== 0)
      throw new Error('Cannot serialize zero-input tx.');

    bw.writeU16(this.version);
    bw.writeU16(this.type);

    bw.writeVarint(this.inputs.length);

    for (const input of this.inputs)
      input.toWriter(bw);

    bw.writeVarint(this.outputs.length);

    for (const output of this.outputs)
      output.toWriter(bw);

    bw.writeU32(this.locktime);

    if(this.isSpecialTransaction() && this.hasExtraPayload()) {
      var payload = Payload.serializeToBuffer(this.extraPayload);
      bw.writeVarint(payload.length);
      bw.writeBytes(payload);
    }

    return bw;
  }

  /**
   * Calculate the real size of the transaction
   * @returns {RawTX}
   */

  getNormalSizes() {
    let base = 0;

    base += 2; // version
    base += 2; // type

    base += encoding.sizeVarint(this.inputs.length);

    for (const input of this.inputs)
      base += input.getSize();

    base += encoding.sizeVarint(this.outputs.length);

    for (const output of this.outputs)
      base += output.getSize();

    base += 4;

    if(this.isSpecialTransaction()) {
      base += this.getExtraPayloadSize();
    }

    return new RawTX(base);
  }

  setType(type) {
    if(Boolean(this.type)) {
      throw new Error('Tx Type is already set');
    }

    assert(typeof this.type === 'number', 'Tx type needs to be a number');
    this.type = type;
    this.setExtraPayload(Payload.create(type));

    return this;
  }

  /**
   * Returns true if this transaction is DIP2 special transaction, returns false otherwise.
   * @returns {boolean}
   */

  isSpecialTransaction() {
    return (
      this.version >= policy.SPECIAL_TRANSACTION_ACTIVATION_VERSION && 
      !!this.type &&
      this.type !== TRANSACTION_NORMAL
    );
  }

  /**
   * Checks if transaction has DIP2 extra payload
   * @returns {boolean}
   */
  hasExtraPayload() {
    return !!this.extraPayload;
  };

  /**
   * @param {AbstractPayload} payload
   * @return {Transaction}
   */
  setExtraPayload(payload) {
    if (!Boolean(this.type)) {
      throw new Error('Transaction type is not set');
    }
    if (!Payload.hasCorrectType(this.type, payload)) {
      throw new Error("Payload doesn't match the transaction type");
    }
    this.extraPayload = payload;
    return this;
  };

  /**
   * Return extra payload size in bytes
   * @return {Number}
   */
  getExtraPayloadSize() {
    assert(this.extraPayload, 'No extra payload on tx. Cannot get size.');
    return Payload.getPayloadSize(this.extraPayload);
  };

  getExtraPayloadJSON() {
    if(this.isSpecialTransaction())
      return Payload.serializeToJSON(this.extraPayload);

    return null;
  }

  getInputsHash() {
    const inputBuffers = new BufferSet();

    for (const input of this.inputs) {
      const key = input.prevout.toKey();
      inputBuffers.add(key);
    }

    const inputsBuffer = bio.concat(inputBuffers);
    const inputsHash = hash256.digest(inputsBuffer);
    const inputHash = util.revHex(inputsHash.toString('hex'));
    return inputHash;
  }

  /**
   * Test whether an object is a TX.
   * @param {Object} obj
   * @returns {Boolean}
   */

  static isTX(obj) {
    return obj instanceof TX;
  }
}

/*
 * Helpers
 */

class RawTX {
  constructor(size) {
    this.data = null;
    this.size = size;
  }
}

/*
 * Expose
 */

module.exports = TX;
