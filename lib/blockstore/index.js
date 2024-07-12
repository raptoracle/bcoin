/*!
 * blockstore/index.js - bitcoin blockstore for bcoin
 * Copyright (c) 2019, Braydon Fuller (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const {join} = require('path');
const assert = require('bsert');

const AbstractBlockStore = require('./abstract');
const LevelBlockStore = require('./level');
const FileBlockStore = require('./file');
const ExternalBlockStore = require('./external');

/**
 * @module blockstore
 */

exports.create = (options) => {
  if (options.db != null && options.db != "leveldb") {
    assert(Object.keys(options.externalOptions).length >= 1, 'External DB options not set!');
    return new ExternalBlockStore({
      externalOptions: options.externalOptions,
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
exports.ExternalBlockStore = ExternalBlockStore;
