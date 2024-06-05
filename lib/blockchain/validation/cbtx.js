/*!
 * validation/cbtx.js - coinbase transaction validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const consensus = require('../params/consensus');
const AbstractTx = require('./abstract');

const {
  TRANSACTION_COINBASE,
} = require('../params/common').registeredTransactionTypes;
/**
 * CbTx
 * Validates a coinbase transaction.
 * @alias module:blockchain.validation.CbTx
 */

class CbTx extends AbstractTx {
  /**
   * Create a coinbase validation.
   * @constructor
   */

  constructor(options) {
    super(options);
    this.tx = options.tx;
    this.prev = options.prev;
  }

  /**
   * Verifies a coinbase transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  async verify() {
    if(this.tx.type !== TRANSACTION_COINBASE)
      return [false, 'bad-cbtx-type', 100];

    if(!this.tx.isCoinbase())
      return [false, 'bad-cbtx-invalid', 100];

    const cbTx = this.tx.getExtraPayloadJSON();

    if(!cbTx)
      return [false, 'bad-cbtx-payload', 100];

    if(cbTx.version === 0 || cbTx.version > 2)
      return [false, 'bad-cbtx-version', 100];
    
    if(this.prev && this.prev.height + 1 !== cbTx.height)
      return [false, 'bad-cbtx-height', 100];

    if(this.prev) {
      if(consensus.DIP0008Enabled && cbTx.version < 2)
        return [false, 'bad-cbtx-version', 100];
    }

    return [true, 'valid', 0];
  }

}

/*
 * Expose
 */

module.exports = CbTx;
