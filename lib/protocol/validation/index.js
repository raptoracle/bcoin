/*!
 * index.js - special transaction validation for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const AbstractTx = require('./abstract');
const ProTx = require('./protx');
const CbTx = require('./cbtx');
const QcTx = require('./qctx');
const FTx = require('./ftx');

const {
  TRANSACTION_PROVIDER_REGISTER,
  TRANSACTION_PROVIDER_UPDATE_SERVICE,
  TRANSACTION_PROVIDER_UPDATE_REGISTRAR,
  TRANSACTION_PROVIDER_UPDATE_REVOKE,
  TRANSACTION_COINBASE,
  TRANSACTION_QUORUM_COMMITMENT,
  TRANSACTION_FUTURE
} = require('../params/common').registeredTransactionTypes;

exports.check = (options) => {
  try {
    switch(options.tx.type) {
      case TRANSACTION_PROVIDER_REGISTER:
      case TRANSACTION_PROVIDER_UPDATE_SERVICE:
      case TRANSACTION_PROVIDER_UPDATE_REGISTRAR:
      case TRANSACTION_PROVIDER_UPDATE_REVOKE:
        const protx = new ProTx(options);
        return protx.verify();
      case TRANSACTION_COINBASE:
        const cbtx = new CbTx(options);
        return cbtx.verify();
      case TRANSACTION_QUORUM_COMMITMENT:
        const qctx = new QcTx(options);
        return qctx.verify();
      case TRANSACTION_FUTURE:
        const ftx = new FTx(options);
        return ftx.verify();
    }
  } catch (e) {
    console.log(e);
    return [false, 'failed-check-special-tx', 100];
  }
  return [false, 'bad-tx-type-check', 10];
};

exports.AbstractTx = AbstractTx;
exports.ProTx = ProTx;
exports.CbTx = CbTx;
exports.QcTx = QcTx;
exports.FTx = FTx;
