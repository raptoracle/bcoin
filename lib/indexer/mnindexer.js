/*!
 * mnindexer.js - Master/Smart node type transaction indexer for bcoin
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
const DeterministicMNList = require('../protocol/smartnodes/SimplifiedMNList');
const DeterministicMNListDiff = require('../protocol/smartnodes/SimplifiedMNListDiff');
const {roundMs} = require('../utils/util');
const {registeredTransactionTypes} = common;
const {
  TRANSACTION_PROVIDER_REGISTER,
  TRANSACTION_PROVIDER_UPDATE_REGISTRAR,
  TRANSACTION_PROVIDER_UPDATE_SERVICE,
  TRANSACTION_PROVIDER_UPDATE_REVOKE,
} = registeredTransactionTypes;
/*
 * MNIndexer Database Layout:
 *  t[hash] -> tx record
 *  b[height] -> block record
 *  s[timestamp] -> timestamp
 *  R[hash] -> register mn tx record
 *  u[hash] -> update registrar mn tx record
 *  s[hash] -> update service tx record
 *  r[hash] -> update revoke mn tx record
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
  u: bdb.key('u', ['hash256']),
  e: bdb.key('e', ['hash256']),
  m: bdb.key('m', ['hash256']),
});

class MNList {
  constructor() {
    this.list = [];
    this.height = -1;
  }

  getListForBlock(block) {

  }

  getMNPayee() {

  }

  setHeight(height) {
    this.height = height;
  }

  getHeight() {
    return this.height;
  }

  buildDiff(cmpList) {

  }

  updateMN(proTxHash) {

  }

  forEachMN() {

  }

  getAllMNsCount() {

  }

}

class MNListDiff {
  constructor() {
    this.list = [];
    this.height = -1;
  }

  hasChanges() {

  }

}

class MNManager {
  constructor(options = {}) {
    this.chain = options.chain;
    this.network = options.network;
    this.oldList = {};
    this.newList = {};
    this.diff = {};
    this.height = -1;
  }

  processBlock(block, meta, view) {
    try {
      this.height = meta.height;
      const pprev = this.chain.getEntryByHeight(this.height - 1);
      if (!this.buildNewListFromBlock(block, meta, view, pprev, this.newList))
        return false;
      if(this.newList.getHeight() == -1)
        this.newList.setHeight(this.height);
      this.newList.setBlockHash(meta.hash);
      this.oldList = this.oldList.getListForBlock(pprev);
      this.diff = this.oldList.buildDiff(this.newList);

      //db write stuff

      this.diff.height = this.height;
      //emplace thing mnlistdiffcache
    } catch (e) {
      console.log(e);
    }

    if(this.diff.hasChanges()) {

    }
  }

  buildNewListFromBlock(block, meta, view, pprev, newList) {
    const height = pprev.height + 1;
    this.oldList = this.getListForBlock(pprev);
    this.newList = this.oldList;
    //newList.setBlockHash();
    newList.setHeight(height);
    this.payee = this.oldList.getMNPayee();
    this.oldList.forEachMN();
  }
}

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
 * MNIndexer
 * @alias module:indexer.MNIndexer
 * @extends Indexer
 */

class MNIndexer extends Indexer {
  /**
   * Create a indexer
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    super('tx', options);

    this.db = bdb.create(this.options);
    this.mnManager = new MNManager(this.options);
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

    this.mnManager.processBlock(meta, block, view);

    let regs = [];
    let upRegs = [];
    let upServs = [];
    let upRevs = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();
      const {offset, size} = tx.getPosition(meta.height);
      const payload = tx.getExtraPayloadJSON();

      const txrecord = new TxRecord({
        height: meta.height,
        index: i,
        offset: offset,
        length: size
      });



      if(tx.type === TRANSACTION_PROVIDER_REGISTER) {
        regs.push({hash: hash, record: txrecord, payload: payload});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_REGISTRAR) {
        upRegs.push({hash: hash, record: txrecord, payload: payload});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_SERVICE) {
        upServs.push({hash: hash, record: txrecord, payload: payload});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_REVOKE) {
        upRevs.push({hash: hash, record: txrecord, payload: payload});
      }
    }

    if(regs.length > 0 || upRegs.length > 0 || upServs.length > 0 || upRevs.length > 0) {
      this.put(layout.b.encode(meta.height), brecord.toRaw());
      this.put(layout.s.encode(time), fromU32(meta.height));
    }

    if(regs.length > 0) {
      for (const reg of regs) {
        this.put(layout.c.encode(reg.hash), reg.record.toRaw());
      }
    }
    if(upRegs.length > 0) {
      for (const upReg of upRegs) {
        this.put(layout.u.encode(upReg.hash), upReg.record.toRaw());
      }
    }
    if(upServs.length > 0) {
      for (const upServ of upServs) {
        this.put(layout.e.encode(upServ.hash), upServ.record.toRaw());
      }
    }
    if(upRevs.length > 0) {
      for (const upRev of upRevs) {
        this.put(layout.m.encode(upRev.hash), upRev.record.toRaw());
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
    let regs = [];
    let upRegs = [];
    let upServs = [];
    let upRevs = [];

    for (let i = 0; i < block.txs.length; i++) {
      const tx = block.txs[i];
      const hash = tx.hash();
      if(tx.type === TRANSACTION_PROVIDER_REGISTER) {
        regs.push({hash: hash});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_REGISTRAR) {
        upRegs.push({hash: hash});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_SERVICE) {
        upServs.push({hash: hash});
      }
      if(tx.type === TRANSACTION_PROVIDER_UPDATE_REVOKE) {
        upRevs.push({hash: hash});
      }
    }

    if(regs.length > 0 || upRegs.length > 0 || upServs.length > 0 || upRevs.length > 0) {
      this.del(layout.b.encode(meta.height));
      this.del(layout.s.encode(time));
    }

    if(regs.length > 0) {
      for (const reg of regs) {
        this.del(layout.c.encode(reg.hash));
      }
    }
    if(upRegs.length > 0) {
      for (const upReg of upRegs) {
        this.del(layout.u.encode(upReg.hash));
      }
    }
    if(upServs.length > 0) {
      for (const upServ of upServs) {
        this.del(layout.e.encode(upServ.hash));
      }
    }
    if(upRevs.length > 0) {
      for (const upRev of upRevs) {
        this.del(layout.m.encode(upRev.hash));
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
module.exports = MNIndexer;
