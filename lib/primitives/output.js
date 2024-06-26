/*!
 * output.js - output object for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const BN = require('bcrypto/lib/bn');
const bio = require('bufio');
const Amount = require('../units/amount');
const Network = require('../protocol/network');
const Address = require('../primitives/address');
const Script = require('../script/script');
const {policy} = require('../protocol/params');
const {inspectSymbol} = require('../utils');

/**
 * Represents a transaction output.
 * @alias module:primitives.Output
 * @property {BN} value
 * @property {Script} script
 */

class Output {
  /**
   * Create an output.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    this.value = new BN(0);
    this.script = new Script();

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    assert(options, 'Output data is required.');

    if (options.value) {
      //assert(Number.isSafeInteger(options.value) && options.value >= 0,
      //  'Value must be a safe integer or bigint.');
      assert((!Number.isNaN(options.value) && options.value >= 0) || BN.isBN(options.value),
        'Value must be a uint64 or BN.');
      this.value = new BN(options.value);
    }

    if (options.script)
      this.script.fromOptions(options.script);

    if (options.address)
      this.script.fromAddress(options.address);

    return this;
  }

  /**
   * Instantiate output from options object.
   * @param {Object} options
   * @returns {Output}
   */

  static fromOptions(options) {
    return new this().fromOptions(options);
  }

  /**
   * Inject properties from script/value pair.
   * @private
   * @param {Script|Address} script
   * @param {Amount} value
   * @returns {Output}
   */

  fromScript(script, value) {
    if (typeof script === 'string')
      script = Address.fromString(script);

    if (script instanceof Address)
      script = Script.fromAddress(script);

    assert(script instanceof Script, 'Script must be a Script.');
    assert((!Number.isNaN(value) && value >= 0) || BN.isBN(value),
      'Value must be a uint64 or BN.');

    this.script = script;
    this.value = new BN(value);

    return this;
  }

  /**
   * Instantiate output from script/value pair.
   * @param {Script|Address} script
   * @param {Amount} value
   * @returns {Output}
   */

  static fromScript(script, value) {
    return new this().fromScript(script, value);
  }

  /**
   * Clone the output.
   * @returns {Output}
   */

  clone() {
    const output = new this.constructor();
    output.value = this.value;
    output.script.inject(this.script);
    return output;
  }

  /**
   * Test equality against another output.
   * @param {Output} output
   * @returns {Boolean}
   */

  equals(output) {
    assert(Output.isOutput(output));
    //return this.value === output.value
    return this.value.eq(output.value)
      && this.script.equals(output.script);
  }

  /**
   * Compare against another output (BIP69).
   * @param {Output} output
   * @returns {Number}
   */

  compare(output) {
    assert(Output.isOutput(output));
    assert(BN.isBN(this.value), "output.js compare(), value expected to be BN");
    assert(BN.isBN(output.value), "output.js compare(), output.value expected to be BN");

    //const cmp = this.value - output.value;
    const cmp = this.value.isub(output.value);

    //if (cmp !== 0)
    if (!cmp.eqn(0))
      return cmp;

    return this.script.compare(output.script);
  }

  /**
   * Get the script type as a string.
   * @returns {ScriptType} type
   */

  getType() {
    return Script.typesByVal[this.script.getType()].toLowerCase();
  }

  /**
   * Get the address.
   * @returns {Address} address
   */

  getAddress() {
    return this.script.getAddress();
  }

  /**
   * Get the address hash.
   * @param {String?} enc
   * @returns {Hash} hash
   */

  getHash(enc) {
    const addr = this.getAddress();

    if (!addr)
      return null;

    return addr.getHash(enc);
  }

  /**
   * Convert the input to a more user-friendly object.
   * @returns {Object}
   */

  [inspectSymbol]() {
    return {
      type: this.getType(),
      value: this.value,
      script: this.script,
      address: this.getAddress()
    };
  }

  /**
   * Convert the output to an object suitable
   * for JSON serialization.
   * @returns {Object}
   */

  toJSON() {
    return this.getJSON();
  }

  /**
   * Convert the output to an object suitable
   * for JSON serialization.
   * @param {Network} network
   * @returns {Object}
   */

  getJSON(network) {
    let addr = this.getAddress();

    network = Network.get(network);

    if (addr)
      addr = addr.toString(network);

    return {
      value: new BN(this.value).toNumber(),
      script: this.script.toJSON(),
      address: addr
    };
  }

  /**
   * Calculate the dust threshold for this
   * output, based on serialize size and rate.
   * @param {Rate?} rate
   * @returns {Amount}
   */

  getDustThreshold(rate) {
    if (this.script.isUnspendable())
      return 0;

    let size = this.getSize();

    size += 32 + 4 + 1 + 107 + 4;

    return 3 * policy.getMinFee(size, rate);
  }

  /**
   * Calculate size of serialized output.
   * @returns {Number}
   */

  getSize() {
    return 8 + this.script.getVarSize();
  }

  /**
   * Test whether the output should be considered dust.
   * @param {Rate?} rate
   * @returns {Boolean}
   */

  isDust(rate) {
    let dtbn = new BN(this.getDustThreshold(rate));
    return this.value.lt(dtbn);
  }

  /**
   * Inject properties from a JSON object.
   * @private
   * @param {Object} json
   */

  fromJSON(json) {
    assert(json, 'Output data is required.');
    assert((!Number.isNaN(value) && value >= 0) || BN.isBN(value),
      'Value must be a uint64 or BN.');

    this.value = new BN(json.value);
    this.script.fromJSON(json.script);
    return this;
  }

  /**
   * Instantiate an Output from a jsonified output object.
   * @param {Object} json - The jsonified output object.
   * @returns {Output}
   */

  static fromJSON(json) {
    return new this().fromJSON(json);
  }

  /**
   * Write the output to a buffer writer.
   * @param {BufferWriter} bw
   */

  toWriter(bw) {
    assert(BN.isBN(this.value), "output.js toWriter(), value expected to be BN");
    bw.writeBigU64(this.value.toBigInt());
    bw.writeVarBytes(this.script.toRaw());
    return bw;
  }

  /**
   * Serialize the output.
   * @returns {Buffer|String}
   */

  toRaw() {
    const size = this.getSize();
    return this.toWriter(bio.write(size)).render();
  }

  /**
   * Inject properties from buffer reader.
   * @private
   * @param {BufferReader} br
   */

  fromReader(br) {
    this.value = new BN(br.readBigU64());
    this.script.fromRaw(br.readVarBytes());
    return this;
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
   * Instantiate an output from a buffer reader.
   * @param {BufferReader} br
   * @returns {Output}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate an output from a serialized Buffer.
   * @param {Buffer} data
   * @param {String?} enc - Encoding, can be `'hex'` or null.
   * @returns {Output}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }

  /**
   * Test an object to see if it is an Output.
   * @param {Object} obj
   * @returns {Boolean}
   */

  static isOutput(obj) {
    return obj instanceof Output;
  }
}

/*
 * Expose
 */

module.exports = Output;
