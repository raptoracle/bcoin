/*!
 * payload.js - payload object for bcoin
 * Copyright (c) 2024, Raptoracle developers (MIT License)
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const AbstractPayload = require('./abstractpayload');
const CoinbasePayload = require('./coinbasepayload');
const CommitmentTxPayload = require('./commitmenttxpayload');
const ProRegTxPayload = require('./proregtxpayload');
const ProTxUpServPayload = require('./proupservtxpayload');
const ProUpRegTxPayload = require('./proupregtxpayload');
const ProUpRevTxPayload = require('./prouprevtxpayload');
const FutureTxPayload = require('./futuretxpayload');
const AssetCreateTxPayload = require('./assetcreatetxpayload');
const AssetUpTxPayload = require('./assetuptxpayload');
const AssetMintTxPayload = require('./assetminttxpayload');

const {
  TRANSACTION_COINBASE,
  TRANSACTION_QUORUM_COMMITMENT,
  TRANSACTION_PROVIDER_REGISTER,
  TRANSACTION_PROVIDER_UPDATE_SERVICE,
  TRANSACTION_PROVIDER_UPDATE_REGISTRAR,
  TRANSACTION_PROVIDER_UPDATE_REVOKE,
  TRANSACTION_FUTURE,
  TRANSACTION_NEW_ASSET,
  TRANSACTION_UPDATE_ASSET,
  TRANSACTION_MINT_ASSET
} = require('../../protocol/params/common').registeredTransactionTypes;

const PayloadClasses = {};
PayloadClasses[TRANSACTION_COINBASE] = CoinbasePayload;
PayloadClasses[TRANSACTION_QUORUM_COMMITMENT] = CommitmentTxPayload;
PayloadClasses[TRANSACTION_PROVIDER_REGISTER] = ProRegTxPayload;
PayloadClasses[TRANSACTION_PROVIDER_UPDATE_SERVICE] = ProTxUpServPayload;
PayloadClasses[TRANSACTION_PROVIDER_UPDATE_REGISTRAR] = ProUpRegTxPayload;
PayloadClasses[TRANSACTION_PROVIDER_UPDATE_REVOKE] = ProUpRevTxPayload;
PayloadClasses[TRANSACTION_FUTURE] = FutureTxPayload;
PayloadClasses[TRANSACTION_NEW_ASSET] = AssetCreateTxPayload;
PayloadClasses[TRANSACTION_UPDATE_ASSET] = AssetUpTxPayload;
PayloadClasses[TRANSACTION_MINT_ASSET] = AssetMintTxPayload;

/**
 *
 * @param {number} payloadType
 * @return {AbstractPayload}
 */
function getPayloadClass(payloadType) {
  var GenericPayload = PayloadClasses[payloadType];
  if (!GenericPayload) {
    throw new Error('Unknown special transaction type');
  }
  return GenericPayload;
}

/**
 * Parses payload and returns instance of payload to work with
 * @param {number} payloadType
 * @param {Buffer} rawPayload
 * @return {AbstractPayload}
 */
exports.parsePayloadBuffer = function parsePayloadBuffer(payloadType, rawPayload) {
  var Payload = getPayloadClass(payloadType);
  return Payload.fromBuffer(rawPayload);
}

/**
 * @param {Number} payloadType
 * @param {Object} payloadJson
 * @return {AbstractPayload}
 */
exports.parsePayloadJSON = function parsePayloadJSON(payloadType, payloadJson) {
  var Payload = getPayloadClass(payloadType);
  return Payload.fromJSON(payloadJson);
}

/**
 * Create an empty instance of payload class
 * @param payloadType
 * @return {AbstractPayload}
 */
exports.createPayload = function createPayload(payloadType) {
  var Payload = getPayloadClass(payloadType);
  return new Payload();
}

/**
 * Checks if type matches payload
 * @param {number} payloadType
 * @param {AbstractPayload} payload
 * @return {boolean}
 */
exports.isPayloadMatchesType = function isPayloadMatchesType(payloadType, payload) {
  var GenericPayload = getPayloadClass(payloadType);
  return payload instanceof GenericPayload;
}

/**
 * Serializes payload
 * @param {AbstractPayload} payload
 * @return {Buffer}
 */
exports.serializePayloadToBuffer = function serializePayloadToBuffer(payload) {
  return payload.toBuffer();
}

/**
 * Serializes payload to JSON
 * @param payload
 * @return {Object}
 */
exports.serializePayloadToJSON = function serializePayloadToJSON(payload) {
  return payload.toJSON();
}

exports.getPayloadSize = function getPayloadSize(payload) {
  return payload.toBuffer().length;
}

exports.parseBuffer = exports.parsePayloadBuffer;
exports.parseJSON = exports.parsePayloadJSON;
exports.serializeToBuffer = exports.serializePayloadToBuffer;
exports.serializeToJSON = exports.serializePayloadToJSON;
exports.create = exports.createPayload;
exports.hasCorrectType = exports.isPayloadMatchesType;
