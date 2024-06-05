/*!
 * blockchain/validation/abstract.js - abstract validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

/**
 * Abstract Validation
 *
 * @alias module:blockchain.validation.AbstractTx
 * @abstract
 */

class AbstractTx {
  /**
   * Create an abstract validation.
   * @constructor
   */

  constructor(options) {
    this.options = options || {};
  }

  async checkService(proTxHash, proTx) {
    return true;
  }

  async checkHashSig(proTx, keyID) {
    return true;
  }

  async checkStringSig(proTx, keyID) {
    return true;
  }

  async checkHashPK(proTx, pubKey) {
    return true;
  }

  async checkInputsHash(tx, proTx) {
    return true;
  }

}

/*
 * Expose
 */

module.exports = AbstractTx;
