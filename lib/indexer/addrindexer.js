/*!
 * addrindexer.js - address indexer for bcoin
 * Copyright (c) 2018, the bcoin developers (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('assert');
const BN = require('bcrypto/lib/bn');
const _ = require('lodash');
const bdb = require('bdb');
const bio = require('bufio');
const {BufferSet} = require('buffer-map');
const layout = require('./layout');
const Address = require('../primitives/address');
const Indexer = require('./indexer');
const {roundMs, ms} = require('../utils/util');

/*
 * AddrIndexer Database Layout:
 *  A[addr-prefix][addr-hash][height][index] -> dummy (tx by address)
 *  C[height][index] -> hash (tx hash by height and index)
 *  c[hash]-> height + index (tx height and index by hash)
 *  g[addr-prefix][addr-hash][timestamp] -> spent
 *  h[addr-prefix][addr-hash][timestamp] -> received
 *  s[addr-prefix][addr-hash][timestamp] -> balance
 *
 * The database layout is organized so that transactions are
 * sorted in the same order as the blocks using the block height
 * and transaction index. This provides the ability to query for
 * sets of transactions within that order. For a wallet that would
 * like to synchronize or rescan, this could be a query for all of
 * the latest transactions, but not for earlier transactions that
 * are already known.
 *
 * To be able to query for all transactions in multiple sets without
 * reference to height and index, there is a mapping from tx hash to
 * the height and index as an entry point.
 *
 * A mapping of height and index is kept for each transaction
 * hash so that the tx hash is not repeated for every address within
 * a transaction.
 */

Object.assign(layout, {
  A: bdb.key('A', ['uint8', 'hash', 'uint32', 'uint32']),
  C: bdb.key('C', ['uint32', 'uint32']),
  c: bdb.key('c', ['hash256']),
  d: bdb.key('d', ['uint8', 'hash', 'uint32']), // height spent/received
  g: bdb.key('g', ['uint8', 'hash', 'uint32']), // timestamp spent/received
  Q: bdb.key('Q', ['uint8', 'hash']), // balance
});

/**
 * Amounts
 */

class Amounts {
  /**
   * Create amount record.
   * @constructor
   * @param {BN} spent
   * @param {BN} received
   * @param {BN} delta
   */

  constructor(spent, received, delta) {
    this.spent = spent || new BN(0);
    this.received = received || new BN(0);
    this.delta = delta || new BN(0);

    //assert((this.spent >>> 0) === this.spent);
    //assert((this.received >>> 0) === this.received);
  }

  /**
   * Serialize.
   * @returns {Buffer}
   */

  toRaw() {
    const bw = bio.write(24);

    bw.writeBigU64(this.spent.toBigInt());
    bw.writeBigU64(this.received.toBigInt());
    bw.writeBigU64(this.delta.toBigInt());

    return bw.render();
  }

  /**
   * Deserialize.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);

    this.spent = new BN(br.readBigU64());
    this.received = new BN(br.readBigU64());
    this.delta = new BN(br.readBigU64());

    return this;
  }

  /**
   * Instantiate amount from a buffer.
   * @param {Buffer} data
   * @returns {Count}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/**
 * Count
 */

class Count {
  /**
   * Create count record.
   * @constructor
   * @param {Number} height
   * @param {Number} index
   */

  constructor(height, index) {
    this.height = height || 0;
    this.index = index || 0;

    assert((this.height >>> 0) === this.height);
    assert((this.index >>> 0) === this.index);
  }

  /**
   * Serialize.
   * @returns {Buffer}
   */

  toRaw() {
    const bw = bio.write(8);

    bw.writeU32(this.height);
    bw.writeU32(this.index);

    return bw.render();
  }

  /**
   * Deserialize.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);

    this.height = br.readU32();
    this.index = br.readU32();

    return this;
  }

  /**
   * Instantiate a count from a buffer.
   * @param {Buffer} data
   * @returns {Count}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }
}

/**
 * AddrIndexer
 * @alias module:indexer.AddrIndexer
 * @extends Indexer
 */

class AddrIndexer extends Indexer {
  /**
   * Create a indexer
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    super('addr', options);

    this.db = bdb.create(this.options);
    this.maxTxs = options.maxTxs || 100;
  }

  /**
   * Index transactions by address.
   * @private
   * @param {BlockMeta} meta
   * @param {Block} block
   * @param {CoinView} view
   */

  async indexBlock(meta, block, view) {
    const height = meta.height;

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();
      const count = new Count(height, i);

      let hasAddress = false;

      for (const addr of tx.getAddresses(view)) {
        const prefix = addr.getPrefix(this.network);
        if (prefix < 0)
          continue;
        const addrHash = addr.getHash();
        this.put(layout.A.encode(prefix, addrHash, height, i), null);
        hasAddress = true;
      }

      if(hasAddress) {
        this.put(layout.C.encode(height, i), hash);
        this.put(layout.c.encode(hash), count.toRaw());
      }

    }

    await this.indexAddressBalance(meta, block, view);
  }

  /**
   * Remove addresses from index.
   * @private
   * @param {BlockMeta} meta
   * @param {Block} block
   * @param {CoinView} view
   */

  async unindexBlock(meta, block, view) {
    const height = meta.height;

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();

      let hasAddress = false;

      for (const addr of tx.getAddresses(view)) {
        const prefix = addr.getPrefix(this.network);

        if (prefix < 0)
          continue;

        const addrHash = addr.getHash();

        this.del(layout.A.encode(prefix, addrHash, height, i));
        this.del(layout.Q.encode(prefix, addrHash));
        hasAddress = true;
      }

      if (hasAddress) {
        this.del(layout.C.encode(height, i));
        this.del(layout.c.encode(hash));
      }
    }
    this.unindexAddressBalance(meta, block, view);
  }

  /**
   * Get transaction hashes to an address in ascending or descending
   * order. If the `after` argument is supplied, results will be given
   * _after_ that transaction hash. The default order is ascending from
   * oldest to latest.
   * @param {Address} addr
   * @param {Object} options
   * @param {Buffer} options.after - A transaction hash
   * @param {Number} options.limit
   * @param {Boolean} options.reverse
   * @returns {Promise} - Returns {@link Hash}[].
   */

  async getHashesByAddress(addr, options = {}) {
    const {after, reverse} = options;
    let {limit} = options;

    if (!limit)
      limit = this.maxTxs;

    if (limit > this.maxTxs)
      throw new Error(`Limit above max of ${this.maxTxs}.`);

    const hash = Address.getHash(addr);
    const prefix = addr.getPrefix(this.network);

    const opts = {
      limit,
      reverse,
      parse: (key) => {
        const [,, height, index] = layout.A.decode(key);
        return [height, index];
      }
    };

    // Determine if the hash -> height + index mapping exists.
    const hasAfter = (after && await this.db.has(layout.c.encode(after)));

    // Check to see if results should be skipped because
    // the after hash is expected to be within a following
    // mempool query.
    const skip = (after && !hasAfter && !reverse);
    if (skip)
      return [];

    if (after && hasAfter) {
      // Give results starting from after
      // the tx hash for the address.
      const raw = await this.db.get(layout.c.encode(after));
      const count = Count.fromRaw(raw);
      const {height, index} = count;

      if (!reverse) {
        opts.gt = layout.A.min(prefix, hash, height, index);
        opts.lte = layout.A.max(prefix, hash);
      } else {
        opts.gte = layout.A.min(prefix, hash);
        opts.lt = layout.A.max(prefix, hash, height, index);
      }
    } else {
      // Give earliest or latest results
      // for the address.
      opts.gte = layout.A.min(prefix, hash);
      opts.lte = layout.A.max(prefix, hash);
    }

    const txs = await this.db.keys(opts);
    const hashes = [];

    for (const [height, index] of txs)
      hashes.push(await this.db.get(layout.C.encode(height, index)));

    return hashes;
  }

  async indexAddressBalance(meta, block, view) {
    const height = meta.height;
    const time = roundMs(block.time);
    const blockValues = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const addressValues = await tx.getAddressesValues(view);

      _.forEach(addressValues, (addr) => {
        const m = _.find(blockValues, {address: addr.address});
      
        const received = new BN(addr.received);
        const spent = new BN(addr.spent);
        const delta = new BN(addr.delta);
      
        if(!m) {
          blockValues.push({
            address: addr.address,
            received: received, 
            spent: spent, 
            delta: delta,
          });
        } else {
          const i = _.findIndex(blockValues, {address: addr.address});
          blockValues[i].received = blockValues[i].received.add(received);
          blockValues[i].spent = blockValues[i].spent.add(spent);
          blockValues[i].delta = blockValues[i].delta.add(delta);
        }  
      });
    }

    _.forEach(blockValues, (entry) => {
      const hash = Buffer.from(entry.address, 'hex');
      const address = Address.fromHash(hash);
      const prefix = address.getPrefix();
      const received = new BN(entry.received);
      const delta = new BN(entry.delta);
      const spent = new BN(entry.spent);
      const amounts = new Amounts(spent, received, delta);
      this.db.put(layout.g.encode(prefix, hash, time), amounts.toRaw());
      this.db.put(layout.d.encode(prefix, hash, height), amounts.toRaw());
      this.updateAddressBalance(address, delta, height);
    });
  }

  async unindexAddressBalance(meta, block, view) {
    const height = meta.height;
    const time = roundMs(block.time);
    const blockValues = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const addressValues = await tx.getAddressesValues(view);

      _.forEach(addressValues, (addr) => {
        const m = _.find(blockValues, {address: addr.address});
      
        const delta = new BN(addr.delta);
      
        if(!m) {
          blockValues.push({
            address: addr.address,
            delta: delta,
          });
        } else {
          const i = _.findIndex(blockValues, {address: addr.address});
          blockValues[i].delta = blockValues[i].delta.add(delta);
        }  
      });
    }

    _.forEach(blockValues, (entry) => {
      const hash = Buffer.from(entry.address, 'hex');
      const address = Address.fromHash(hash);
      const prefix = address.getPrefix();
      const delta = new BN(entry.delta);
      this.db.del(layout.g.encode(prefix, hash, time));
      this.db.del(layout.d.encode(prefix, hash, height));
      this.reWindAddressBalance(address, delta, height);
    });
  }

  async getAddressBalanceByTime(addr, options = {}) {
    let {start, end} = options;
    if(!start) {
      start = roundMs(start);
    } else {
      start = ms() - (1000 * 60 * 60 * 24);
    }
    if(!end) {
      end = roundMs(end);
    } else {
      end = ms();
    }

    const hash = Address.getHash(addr);
    const prefix = addr.getPrefix(this.network);

    const opts = {
      parse: (key) => {
        const [,, time] = layout.g.decode(key);
        return [time];
      }
    };

    opts.gt = layout.g.min(prefix, hash, start);
    opts.lte = layout.g.max(prefix, hash);

    const values = await this.db.keys(opts);

    const times = [];

    for (const [time] of values)
      times.push(await this.db.get(layout.g.encode(prefix, hash, time)));

    return times;
  }

  /**
   * get address balance.
   * @private
   * @param {string} addr
   */

  async getAddressBalance(addr) {
    const address = Address.fromString(addr, this.network);
    const hash = address.getHash();
    const prefix = address.getPrefix();
    const check = await this.db.get(layout.Q.encode(prefix, hash));

    if(!check)
      return new BN(0);

    return new BN(check);
  }

  /**
   * Update address balance.
   * @private
   * @param {Address} address
   * @param {BN} delta
   * @param {Number} height
   */

  async updateAddressBalance(address, delta, height) {
    const hash = address.getHash();
    const prefix = address.getPrefix();
    const addressStr = address.toString(this.network);

    let balance = await this.getAddressBalance(addressStr);

    balance = balance.iadd(delta);

    await this.db.put(layout.Q.encode(prefix, hash), balance.toBuffer());
  }

  async reWindAddressBalance(address, delta, height) {
    const hash = address.getHash();
    const prefix = address.getPrefix();
    const addressStr = address.toString(this.network);

    let balance = await this.getAddressBalance(addressStr);

    balance = balance.isub(delta);
    await this.db.del(layout.Q.encode(prefix, hash));
    await this.db.put(layout.Q.encode(prefix, hash), balance.toBuffer());
  }
}

module.exports = AddrIndexer;
