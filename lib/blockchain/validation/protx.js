/*!
 * validation/protx.js - service provider transaction validation for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const AbstractTx = require('./abstract');
const Script = require('../../script/script');

const {
  TRANSACTION_PROVIDER_REGISTER,
  TRANSACTION_PROVIDER_UPDATE_SERVICE,
  TRANSACTION_PROVIDER_UPDATE_REGISTRAR,
  TRANSACTION_PROVIDER_UPDATE_REVOKE,
} = require('../params/common').registeredTransactionTypes;
/**
 * ProTx
 * Validates a provider transaction.
 * @alias module:blockchain.validation.ProTx
 */

class ProTx extends AbstractTx {
  /**
   * Validate provider.
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
    try {
      switch(this.tx.type) {
        case TRANSACTION_PROVIDER_REGISTER:
          return this.checkProRegTx();
        case TRANSACTION_PROVIDER_UPDATE_SERVICE:
          return this.checkProUpServTx();
        case TRANSACTION_PROVIDER_UPDATE_REGISTRAR:
          return this.checkProUpRegTx();
        case TRANSACTION_PROVIDER_UPDATE_REVOKE:
          return this.checkProUpRevTx();
      }
    } catch (e) {
      return [false, 'failed-check-protx', 100];
    }
    return [false, 'bad-protx-type-check', 10];
  }

  /**
   * Checks a Provider Registration transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  async checkProRegTx() {
    if(this.tx.type !== TRANSACTION_PROVIDER_REGISTER)
      return [false, 'bad-protx-type', 100];

    const pTx = this.tx.getExtraPayloadJSON();

    if(!pTx)
      return [false, 'bad-protx-payload', 100];

    if(pTx.version === 0 || pTx.version > 1)
      return [false, 'bad-protx-version', 100];

    if(pTx.type !== 0)
      return [false, 'bad-protx-type', 100];

    if(pTx.mode !== 0)
      return [false, 'bad-protx-mode', 100];

    let script = Script.fromAddress(pTx.payoutAddress);

    if(!script.isPubkeyhash() && !script.isScripthash())
      return [false, 'bad-protx-payee', 10];

    let payoutDest = script.getAddress();
    if(!payoutDest)
      return [false, 'bad-protx-payee-dest', 10];

    if(payoutDest === pTx.keyIDOwner || payoutDest === pTx.keyIDVoting)
      return [false, 'bad-protx-payee-reuse', 10];

    //if (ptx.addr != CService() && !CheckService(tx.GetHash(), ptx, state)) {

    if(pTx.operatorReward > 10000)
      return [false, 'bad-protx-operator-reward', 10];

    //if (!ptx.collateralOutpoint.hash.IsNull()) {

    //if (collateralTxDest == CTxDestination(ptx.keyIDOwner) || collateralTxDest == CTxDestination(ptx.keyIDVoting)) {

    //if (!CheckInputsHash(tx, ptx, state)) {

    //if (keyForPayloadSig) {

    return [true, 'valid', 0];
  }

  /**
   * Checks a Provider Update Service transaction
   * @param {TX} tx
   * @param {ChainEntry} prev
   * @returns {Array} [valid, reason, score]
   */

  async checkProUpServTx() {
    if(this.tx.type !== TRANSACTION_PROVIDER_UPDATE_SERVICE)
      return [false, 'bad-protx-type', 100];

    const pTx = this.tx.getExtraPayloadJSON();

    if(!pTx)
      return [false, 'bad-protx-payload', 100];

    if(pTx.version === 0 || pTx.version > 1)
      return [false, 'bad-protx-version', 100];

    // if (!CheckService(ptx.proTxHash, ptx, state)) {

    if(this.prev) {

    }
    return [true, 'valid', 0];
  }

  async checkProUpRegTx() {
    if(this.tx.type !== TRANSACTION_PROVIDER_UPDATE_REGISTRAR)
      return [false, 'bad-protx-type', 100];

    const pTx = this.tx.getExtraPayloadJSON();

    if(!pTx)
      return [false, 'bad-protx-payload', 100];

    if(pTx.version === 0 || pTx.version > 1)
      return [false, 'bad-protx-version', 100];

    if(pTx.mode !== 0)
      return [false, 'bad-protx-mode', 100];

    //if (!ptx.pubKeyOperator.IsValid() || ptx.keyIDVoting.IsNull()) {

    //if (!ptx.scriptPayout.IsPayToPublicKeyHash() && !ptx.scriptPayout.IsPayToScriptHash()) {

    let script = Script.fromAddress(pTx.payoutAddress);

    if(!script.isPubkeyhash() && !script.isScripthash())
      return [false, 'bad-protx-payee', 10];

    let payoutDest = script.getAddress();
    if(!payoutDest)
      return [false, 'bad-protx-payee-dest', 10];

    if(this.prev) {

    }

    return [true, 'valid', 0];
  }

  async checkProUpRevTx() {
    if(this.tx.type !== TRANSACTION_PROVIDER_UPDATE_REVOKE)
      return [false, 'bad-protx-type', 100];

    const pTx = this.tx.getExtraPayloadJSON();

    if(!pTx)
      return [false, 'bad-protx-payload', 100];

    if(pTx.version === 0 || pTx.version > 1)
      return [false, 'bad-protx-version', 100];

    return [true, 'valid', 0];
  }


}

/*
 * Expose
 */

module.exports = ProTx;
