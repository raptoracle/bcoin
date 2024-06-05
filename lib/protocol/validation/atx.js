/*!
 * validation/atx.js - asset transaction validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const AbstractTx = require('./abstract');

const {
  TRANSACTION_PROVIDER_REGISTER,
  TRANSACTION_PROVIDER_UPDATE_SERVICE,
  TRANSACTION_PROVIDER_UPDATE_REGISTRAR,
  TRANSACTION_PROVIDER_UPDATE_REVOKE,
  TRANSACTION_COINBASE,
  TRANSACTION_QUORUM_COMMITMENT,
  TRANSACTION_FUTURE
} = require('../params/common').registeredTransactionTypes;

/**
 * ATx
 * Validates an asset transaction.
 * @alias module:blockchain.validation.ATx
 */

class ATx extends AbstractTx {
  /**
   * Validate asset.
   * @constructor
   */

  constructor(options) {
    super(options);
    this.tx = options.tx;
    this.prev = options.prev;
  }

  /**
   * Verifies an asset transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  verify() {
    
  }

}

/*
 * Expose
 */

module.exports = ATx;
