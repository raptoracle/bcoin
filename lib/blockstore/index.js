/*!
 * blockstore/index.js - bitcoin blockstore for bcoin
 * Copyright (c) 2019, Braydon Fuller (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const {join} = require('path');

const AbstractBlockStore = require('./abstract');
const LevelBlockStore = require('./level');
const FileBlockStore = require('./file');
const MongoBlockStore = require('./mongo');

/**
 * @module blockstore
 */

exports.create = (options) => {

  if (options.db === "mongo") {
    return new MongoBlockStore({
      currency: options.currency,
      network: options.network,
      logger: options.logger,
      cacheSize: options.cacheSize,
      memory: options.memory
    });
  }

  if (options.memory) {
    return new LevelBlockStore({
      currency: options.currency,
      network: options.network,
      logger: options.logger,
      cacheSize: options.cacheSize,
      memory: options.memory
    });
  }

  const location = join(options.prefix, 'blocks');

  return new FileBlockStore({
    currency: options.currency,
    network: options.network,
    logger: options.logger,
    location: location,
    cacheSize: options.cacheSize
  });
};

exports.AbstractBlockStore = AbstractBlockStore;
exports.FileBlockStore = FileBlockStore;
exports.LevelBlockStore = LevelBlockStore;
exports.MongoBlockStore = MongoBlockStore;
