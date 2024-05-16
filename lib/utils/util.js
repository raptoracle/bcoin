/*!
 * util.js - utils for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('bsert');
const _ = require('lodash');

/**
 * @exports utils/util
 */

const util = exports;
const SHA256_HASH_SIZE = 32;

/**
 * Return hrtime (shim for browser).
 * @param {Array} time
 * @returns {Array} [seconds, nanoseconds]
 */

util.bench = function bench(time) {
  if (!process.hrtime) {
    const now = Date.now();

    if (time) {
      const [hi, lo] = time;
      const start = hi * 1000 + lo / 1e6;
      return now - start;
    }

    const ms = now % 1000;

    // Seconds
    const hi = (now - ms) / 1000;

    // Nanoseconds
    const lo = ms * 1e6;

    return [hi, lo];
  }

  if (time) {
    const [hi, lo] = process.hrtime(time);
    return hi * 1000 + lo / 1e6;
  }

  return process.hrtime();
};

/**
 * Get current time in unix time (seconds).
 * @returns {Number}
 */

util.now = function now() {
  return Math.floor(Date.now() / 1000);
};

/**
 * Get current time in unix time (milliseconds).
 * @returns {Number}
 */

util.ms = function ms() {
  return Date.now();
};

/**
 * Create a Date ISO string from time in unix time (seconds).
 * @param {Number?} time - Seconds in unix time.
 * @returns {String}
 */

util.date = function date(time) {
  if (time == null)
    time = util.now();

  return new Date(time * 1000).toISOString().slice(0, -5) + 'Z';
};

/**
 * Get unix seconds from a Date string.
 * @param {String?} date - Date ISO String.
 * @returns {Number}
 */

util.time = function time(date) {
  if (date == null)
    return util.now();

  return new Date(date) / 1000 | 0;
};

/**
 * Reverse a hex-string.
 * @param {Buffer}
 * @returns {String} Reversed hex string.
 */

util.revHex = function revHex(buf) {
  assert(Buffer.isBuffer(buf));

  return Buffer.from(buf).reverse().toString('hex');
};

util.fromRev = function fromRev(str) {
  assert(typeof str === 'string');
  assert((str.length & 1) === 0);

  return Buffer.from(str, 'hex').reverse();
};

util.revHexStr = function revHexStr(str) {
  return str.match(/[a-fA-F0-9]{2}/g).reverse().join('');
};

/**
 * Determines whether a string contains only hexadecimal values
 *
 * @function
 * @name JSUtil.isHexa
 * @param {string} value
 * @return {boolean} true if the string is the hex representation of a number
 */
util.isHexa = function isHexa(value) {
  if (!_.isString(value)) {
    return false;
  }
  return /^[0-9a-fA-F]+$/.test(value);
};

/**
 * Test if an argument is a valid JSON object. If it is, returns a truthy
 * value (the json object decoded), so no double JSON.parse call is necessary
 *
 * @param {string} arg
 * @return {Object|boolean} false if the argument is not a JSON string.
 */
util.isValidJSON = function isValidJSON(arg) {
  var parsed;
  if (!_.isString(arg)) {
    return false;
  }
  try {
    parsed = JSON.parse(arg);
  } catch (e) {
    return false;
  }
  if (typeof parsed === 'object') {
    return true;
  }
  return false;
};

// Alias of isHexa();
util.isHexaString = util.isHexa;
util.isHexString = util.isHexa;

/**
 * Clone an array
 */
util.cloneArray = function cloneArray(array) {
  return [].concat(array);
};

/**
 * Define immutable properties on a target object
 *
 * @param {Object} target - An object to be extended
 * @param {Object} values - An object of properties
 * @return {Object} The target object
 */
util.defineImmutable = function defineImmutable(target, values) {
  Object.keys(values).forEach(function (key) {
    Object.defineProperty(target, key, {
      configurable: false,
      enumerable: true,
      value: values[key],
    });
  });
  return target;
};

util.isSha256HexString = function isSha256HexString(string) {
  // * 2 as hash size in bytes, and when represented as a hex string 2 symbols is 1 byte
  return util.isHexa(string) && string.length === SHA256_HASH_SIZE * 2;
};

util.isHexStringOfSize = function isHexStringOfSize(string, size) {
  return util.isHexa(string) && string.length === size;
};
