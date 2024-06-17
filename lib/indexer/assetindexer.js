/*!
 * assetindexer.js - asset type transaction indexer for bcoin
 * Copyright (c) 2024, the raptoracle developers (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const assert = require('bsert');
const bdb = require('bdb');
const bio = require('bufio');
const layout = require('./layout');
const {consensus, common} = require('../protocol/params');
const TX = require('../primitives/tx');
const TXMeta = require('../primitives/txmeta');
const Indexer = require('./indexer');
const {roundMs} = require('../utils/util');
const {registeredTransactionTypes} = common;
const {
  TRANSACTION_NEW_ASSET,
  TRANSACTION_UPDATE_ASSET,
  TRANSACTION_MINT_ASSET
} = registeredTransactionTypes;
/*
 * AssetIndexer Database Layout:
 *  t[hash] -> tx record
 *  b[height] -> block record
 *  s[timestamp] -> timestamp
 *  c[hash] -> create asset tx record
 *  p[hash] -> update asset tx record
 *  m[hash] -> mint asset tx record
 *
 * The transaction index maps a transaction to a block
 * and an index, offset, and length within that block. The
 * block hash is stored in a separate record by height so that
 * the 32 byte hash is not repeated for every transaction
 * within a block.
 */

Object.assign(layout, {
  t: bdb.key('t', ['hash256']),
  b: bdb.key('b', ['uint32']),
  s: bdb.key('s', ['uint32']),
  c: bdb.key('c', ['hash256']),
  p: bdb.key('p', ['hash256']),
  m: bdb.key('m', ['hash256']),
});

/**
 * Block Record
 */

class BlockRecord {
  /**
   * Create a block record.
   * @constructor
   */

  constructor(options = {}) {
    this.block = options.block || consensus.ZERO_HASH;
    this.time = options.time || 0;

    assert(this.block.length === 32);
    assert((this.time >>> 0) === this.time);
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);

    this.block = br.readHash();
    this.time = br.readU32();

    return this;
  }

  /**
   * Instantiate block record from serialized data.
   * @param {Buffer} data
   * @returns {BlockRecord}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }

  /**
   * Serialize the block record.
   * @returns {Buffer}
   */

  toRaw() {
    const bw = bio.write(36);

    bw.writeHash(this.block);
    bw.writeU32(this.time);

    return bw.render();
  }
}

/**
 * Transaction Record
 */

class TxRecord {
  /**
   * Create a transaction record.
   * @constructor
   */

  constructor(options = {}) {
    this.height = options.height || 0;
    this.index = options.index || 0;
    this.offset = options.offset || 0;
    this.length = options.length || 0;

    assert((this.height >>> 0) === this.height);
    assert((this.index >>> 0) === this.index);
    assert((this.offset >>> 0) === this.offset);
    assert((this.length >>> 0) === this.length);
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);

    this.height = br.readU32();
    this.index = br.readU32();
    this.offset = br.readU32();
    this.length = br.readU32();

    return this;
  }

  /**
   * Instantiate transaction record from serialized data.
   * @param {Buffer} data
   * @returns {BlockRecord}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }

  /**
   * Serialize the transaction record.
   * @returns {Buffer}
   */

  toRaw() {
    const bw = bio.write(16);

    bw.writeU32(this.height);
    bw.writeU32(this.index);
    bw.writeU32(this.offset);
    bw.writeU32(this.length);

    return bw.render();
  }
}

/**
 * AssetIndexer
 * @alias module:indexer.AssetIndexer
 * @extends Indexer
 */

class AssetIndexer extends Indexer {
  /**
   * Create a indexer
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    super('tx', options);

    this.db = bdb.create(this.options);
  }

  /**
   * Index transactions by txid.
   * @private
   * @param {BlockMeta} meta
   * @param {Block} block
   * @param {CoinView} view
   */

  async indexBlock(meta, block, view) {
    assert(block.hasRaw(), 'Expected raw data for block.');

    const brecord = new BlockRecord({
      block: meta.hash,
      time: block.time
    });
    const time = roundMs(block.time);

    let newAssets = [];
    let upAssets = [];
    let miAssets = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();
      const {offset, size} = tx.getPosition(meta.height);

      const txrecord = new TxRecord({
        height: meta.height,
        index: i,
        offset: offset,
        length: size
      });

      if(tx.type === TRANSACTION_NEW_ASSET) {
        newAssets.push({hash: hash, record: txrecord});
      }
      if(tx.type === TRANSACTION_UPDATE_ASSET) {
        upAssets.push({hash: hash, record: txrecord});
      }
      if(tx.type === TRANSACTION_MINT_ASSET) {
        miAssets.push({hash: hash, record: txrecord});
      }
    }

    if(newAssets.length > 0 || upAssets.length > 0 || miAssets.length > 0) {
      this.put(layout.b.encode(meta.height), brecord.toRaw());
      this.put(layout.s.encode(time), fromU32(meta.height));
    }

    if(newAssets.length > 0) {
      for (const newAsset of newAssets) {
        this.put(layout.c.encode(newAsset.hash), newAsset.record.toRaw());
      }
    }
    if(upAssets.length > 0) {
      for (const upAsset of upAssets) {
        this.put(layout.p.encode(upAsset.hash), upAsset.record.toRaw());
      }
    }
    if(miAssets.length > 0) {
      for (const miAsset of miAssets) {
        this.put(layout.m.encode(miAsset.hash), miAsset.record.toRaw());
      }
    }
  }

  /**
   * Remove transactions from index.
   * @private
   * @param {BlockMeta} meta
   * @param {Block} block
   * @param {CoinView} view
   */

  async unindexBlock(meta, block, view) {
    const time = roundMs(block.time);
    let newAssets = [];
    let upAssets = [];
    let miAssets = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();
      if(tx.type === TRANSACTION_NEW_ASSET) {
        newAssets.push({hash: hash});
      }
      if(tx.type === TRANSACTION_UPDATE_ASSET) {
        upAssets.push({hash: hash});
      }
      if(tx.type === TRANSACTION_MINT_ASSET) {
        miAssets.push({hash: hash});
      }
    }

    if(newAssets.length > 0 || upAssets.length > 0 || miAssets.length > 0) {
      this.del(layout.b.encode(meta.height));
      this.del(layout.s.encode(time));
    }

    if(newAssets.length > 0) {
      for (const newAsset of newAssets) {
        this.del(layout.c.encode(newAsset.hash));
      }
    }
    if(upAssets.length > 0) {
      for (const upAsset of upAssets) {
        this.del(layout.p.encode(upAsset.hash));
      }
    }
    if(miAssets.length > 0) {
      for (const miAsset of miAssets) {
        this.del(layout.m.encode(miAsset.hash));
      }
    }
  }

  /**
   * Get a transaction with metadata.
   * @param {Hash} hash
   * @returns {Promise} - Returns {@link TXMeta}.
   */

  async getMeta(hash) {
    const raw = await this.db.get(layout.t.encode(hash));
    if (!raw)
      return null;

    const record = TxRecord.fromRaw(raw);
    const {height, index, offset, length} = record;

    const braw = await this.db.get(layout.b.encode(height));
    if (!braw)
      return null;

    const brecord = BlockRecord.fromRaw(braw);
    const {block, time} = brecord;

    const data = await this.blocks.read(block, offset, length);

    const tx = TX.fromRaw(data);

    const meta = TXMeta.fromTX(tx);
    meta.height = height;
    meta.block = block;
    meta.time = time;
    meta.index = index;

    const unspent = await this.chain.hasCoinsRef(tx);

    meta.spent = !!unspent ? unspent : false;

    return meta;
  }

  /**
   * Retrieve a transaction.
   * @param {Hash} hash
   * @returns {Promise} - Returns {@link TX}.
   */

  async getTX(hash) {
    const meta = await this.getMeta(hash);

    if (!meta)
      return null;

    return meta.tx;
  }

  /**
   * @param {Hash} hash
   * @returns {Promise} - Returns Boolean.
   */

  async hasTX(hash) {
    return this.db.has(layout.t.encode(hash));
  }

  /**
   * Get coin viewpoint (historical).
   * @param {TX} tx
   * @returns {Promise} - Returns {@link CoinView}.
   */

  async getSpentView(tx) {
    const view = await this.chain.getCoinView(tx);

    for (const {prevout} of tx.inputs) {
      if (view.hasEntry(prevout))
        continue;

      const {hash, index} = prevout;
      const meta = await this.getMeta(hash);

      if (!meta)
        continue;

      const {tx, height} = meta;

      if (index < tx.outputs.length)
        view.addIndex(tx, index, height);
    }

    return view;
  }
}

function fromU32(num) {
  const data = Buffer.allocUnsafe(4);
  data.writeUInt32LE(num, 0, true);
  return data;
}

module.exports = AssetIndexer;
