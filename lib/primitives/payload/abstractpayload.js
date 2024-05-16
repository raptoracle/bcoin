/*!
 * abstractpayload.js - abstract payload object for bcoin
 * Copyright (c) 2024, socialruins (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

//const {inspectSymbol} = require('../utils');
const hash256 = require('bcrypto/lib/hash256');
//const Signer = require('../../crypto/signer');

/**
 * AbstractPayload
 * Represents a Payload.
 * @alias module:primitives.Payload
 */

class AbstractPayload {
  /**
   * Create an filter.
   * @constructor
   */

  constructor() {}

  /**
   *
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature when serializing. Needed for signing payload
   * @return {Buffer}
   */

  toBuffer(options) {
    throw new Error('Not implemented');
  };

  /**
   *
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature when serializing. Needed for signing payload
   * @return {Buffer}
   */

  fromBuffer(options) {
    throw new Error('Not implemented');
  };


  /**
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature when serializing. Needed for signing payload
   * @return {Object}
   */
  toJSON(options) {
    throw new Error('Not implemented');
  };

  /**
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature when serializing. Needed for signing payload
   * @return {string}
   */
  toString(options) {
    return this.toBuffer().toString('hex');
  };

  /**
   * @param [options]
   * @param {Boolean} options.skipSignature - skip signature when serializing. Needed for signing payload
   * @return {Buffer} - hash
   */
  getHash(options) {
    return hash256.digest(this.toBuffer(options));
  };

  /**
   * Signs payload
   * @param {string|PrivateKey} privateKey
   * @return {AbstractPayload}
   */
  sign(privateKey) {
    const payloadHash = this.getHash({ skipSignature: true });
    //const signatureBuffer = Signer.signHash(payloadHash, privateKey);
    //this.payloadSig = signatureBuffer.toString('hex');
    //this.payloadSigSize = this.payloadSig.length / 2;
    return this;
  };

  /**
   * Verify payload signature
   * @param {string|Buffer} publicKeyId
   * @return {boolean}
   */
  verifySignature(publicKeyId) {
    const payloadHash = this.getHash({ skipSignature: true });
    //const signatureBuffer = Buffer.from(this.payloadSig, 'hex');
    //return Signer.verifyHashSignature(payloadHash, signatureBuffer, publicKeyId);
  };


}

/*
 * Expose
 */

module.exports = AbstractPayload;
