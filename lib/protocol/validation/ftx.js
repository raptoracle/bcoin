/*!
 * validation/ftx.js - future transaction validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const AbstractTx = require('./abstract');
const TimeData = require('../../protocol/timedata');

const {
  TRANSACTION_FUTURE
} = require('../params/common').registeredTransactionTypes;
/**
 * FTx
 * Validates a future transaction.
 * @alias module:blockchain.validation.FTx
 */

class FTx extends AbstractTx {
  /**
   * Validate future.
   * @constructor
   */

  constructor(options) {
    super(options);
    this.time = new TimeData();
    this.tip = options.tip;
    this.network = options.network;
    this.tx = options.tx;
    this.prev = options.prev;
  }

  /**
   * Verifies a future transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  async verify() {
    if(this.tip.height < this.network.block.futureForkBlock)
      return [false, 'future-not-enabled', 100];

    if(this.tx.type !== TRANSACTION_FUTURE)
      return [false, 'bad-future-type', 100];

    const ftx = this.tx.getExtraPayloadJSON();

    if(!ftx)
      return [false, 'bad-future-payload', 100];

    if(ftx.version === 0 || ftx.version > 1)
      return [false, 'bad-future-version', 100];

    if(!this.checkInputsHash())
      return [false, 'bad-future-inputs-hash', 100];

    return [true, 'valid', 0];
  }

  validateFutureCoin(coin, spendHeight) {
    //assert(this.extraPayload, 'Need the block the tx is on for future tx validation');
    //let adjustCurrentTime = this.time.now();
    //let confirmedTime = coin.time;
    //let futureTx = Payload.serializeToJSON(this.extraPayload);
    //if(!!futureTx) {
    //  let isBlockMature = futureTx.maturity >= 0 && spendHeight - coin.height >= futureTx.maturity;
    //  let isTimeMature = futureTx.lockTime >= 0 && adjustCurrentTime - confirmedTime >= futureTx.lockTime;
    //  let canSpend = isBlockMature || isTimeMature;
    //  if(!canSpend) {
    //    return "bad-txns-premature-spend-of-future";
    //  }
    //  return;
    //}
    //return "bad-txns-unable-to-parse-future";
  }

  checkSpecialTxFee(fee) {
    //let nFeeTotal, specialTxFee;
    //if(this.version >= 3) {
    //  switch(this.type) {
    //    case TRANSACTION_FUTURE:
    //      let ftx = Payload.serializeToJSON(this.extraPayload);
    //      if(!!ftx) {
    //        specialTxFee = ftx.fee * consensus.COIN;
    //        nFeeTotal -= specialTxFee;
    //      }
    //      break;
    //  }
    //}
    //return true;
  }
}

/*
 * Expose
 */

module.exports = FTx;
