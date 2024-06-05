/*!
 * primitives/payload/index.js - tx payloads for bcoin
 * Copyright (c) 2024, socialruins (MIT License).
 * https://github.com/raptoracle/raptoracle
 */

'use strict';

/**
 * @module payload
 */

const Payload = require('./payload');
Payload.constants = require('../../protocol/params/common');;
Payload.ProRegTxPayload = require('./proregtxpayload');
Payload.ProUpRegTxPayload = require('./proupregtxpayload');
Payload.ProUpRevTxPayload = require('./prouprevtxpayload');
Payload.ProTxUpServPayload = require('./proupservtxpayload');
Payload.CoinbasePayload = require('./coinbasepayload');
Payload.FutureTxPayload = require('./futuretxpayload');
Payload.CommitmentTxPayload = require('./commitmenttxpayload');
//exports.Payload.AssetCreateTxPayload = require('./assetcreatetxpayload');
//exports.Payload.AssetUpTxPayload = require('./assetuptxpayload');
//exports.Payload.AssetMintTxPayload = require('./assetminttxpayload');

module.exports = Payload;
