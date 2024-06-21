/*!
 * network.js - bitcoin networks for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

/**
 * @module protocol/networks
 */

const network = exports;

const {main} = require('./networks/main');
const {testnet} = require('./networks/test');
const {devnet} = require('./networks/devnet');
const {regtest} = require('./networks/reg');
//const {simnet} = require('./networks/sim');

/**
 * Network type list.
 * @memberof module:protocol/networks
 * @const {String[]}
 * @default
 */

network.types = ['main', 'testnet', 'devnet', 'regtest'];

/*
 * Expose
 */

network.main = main;
network.testnet = testnet;
network.devnet = devnet;
network.regtest = regtest;
//network.simnet = simnet;
