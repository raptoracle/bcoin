/*!
 * validation/qctx.js - quorum transaction validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const AbstractTx = require('./abstract');

const {
  TRANSACTION_QUORUM_COMMITMENT,
} = require('../params/common').registeredTransactionTypes;

/**
 * QcTx
 * Validates a quorum transaction.
 * @alias module:blockchain.validation.QcTx
 */

class QcTx extends AbstractTx {
  /**
   * Validate Quorum.
   * @constructor
   */

  constructor(options) {
    super(options);
    this.db = options.db;
    this.tx = options.tx;
    this.prev = options.prev;
  }

  /**
   * Verifies a quorum transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  async verify() {
    if(this.tx.type !== TRANSACTION_QUORUM_COMMITMENT)
      return [false, 'bad-qc-type', 100];

    const qcTx = this.tx.getExtraPayloadJSON();
    if(!qcTx)
      return [false, 'bad-qc-payload', 100];

    if(qcTx.version === 0 || qcTx.version > 1)
      return [false, 'bad-qc-version', 100];

    if(qcTx.height !== this.prev.height + 1)
      return [false, 'bad-qc-height', 100];

    const pindexQuorum = await this.db.getEntryByHash(Buffer.from(qcTx.quorumHash, 'hex').reverse());
    
    if(!pindexQuorum)
      return [false, 'bad-qc-quorum-hash', 100];

    const pindexPrev = await this.db.getEntryByHeight(pindexQuorum.height);

    if(!pindexPrev || pindexQuorum !== pindexPrev)
      return [false, 'bad-qc-quorum-hash', 100];

    //if (qcTx.commitment.IsNull()) {

    // if (!qcTx.commitment.Verify(pindexQuorum, false)) {

    return [true, 'valid', 0];
  }

}

/*
 * Expose
 */

module.exports = QcTx;
