/*!
 * payload.js - payload object for bcoin
 * Copyright (c) 2024, Raptoracle developers (MIT License)
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

const {registeredTransactionTypes} = require('../common').constants;
const AbstractPayload = require('./abstractpayload');
const CoinbasePayload = require('./coinbasepayload');
const CommitmentTxPayload = require('./commitmenttxpayload');
const ProRegTxPayload = require('./proregtxpayload');
const ProTxUpServPayload = require('./proupservtxpayload');
const ProUpRegTxPayload = require('./proupregtxpayload');
const ProUpRevTxPayload = require('./prouprevtxpayload');
const FutureTxPayload = require('./futuretxpayload');
//const AssetCreateTxPayload = require('./assetcreatetxpayload');
//const AssetUpTxPayload = require('./assetuptxpayload');
//const AssetMintTxPayload = require('./assetminttxpayload');

const PayloadClasses = {};
PayloadClasses[registeredTransactionTypes.TRANSACTION_COINBASE] = CoinbasePayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_QUORUM_COMMITMENT] = CommitmentTxPayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_PROVIDER_REGISTER] = ProRegTxPayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_PROVIDER_UPDATE_SERVICE] = ProTxUpServPayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_PROVIDER_UPDATE_REGISTRAR] = ProUpRegTxPayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_PROVIDER_UPDATE_REVOKE] = ProUpRevTxPayload;
PayloadClasses[registeredTransactionTypes.TRANSACTION_FUTURE] = FutureTxPayload;
//PayloadClasses[RegisteredPayloadTypes.TRANSACTION_NEW_ASSET] = AssetCreateTxPayload;
//PayloadClasses[RegisteredPayloadTypes.TRANSACTION_UPDATE_ASSET] = AssetUpTxPayload;
//PayloadClasses[RegisteredPayloadTypes.TRANSACTION_MINT_ASSET] = AssetMintTxPayload;

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

exports.parseBuffer = exports.parsePayloadBuffer;
exports.parseJSON = exports.parsePayloadJSON;
exports.serializeToBuffer = exports.serializePayloadToBuffer;
exports.serializeToJSON = exports.serializePayloadToJSON;
exports.create = exports.createPayload;
exports.hasCorrectType = exports.isPayloadMatchesType;
