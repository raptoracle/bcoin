/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const consensus = require('../blockchain/params/consensus');
const common = require('./common.js');

/**
 * @module net/packets
 */

exports.Types = require('./packets/types.js');
exports.VersionPacket = require('./packets/version.js');
exports.VerackPacket = require('./packets/verack.js');
exports.PingPacket = require('./packets/ping.js');
exports.PongPacket = require('./packets/pong.js');
exports.GetAddrPacket = require('./packets/getaddr.js');
exports.AddrPacket = require('./packets/addr.js');
exports.InvPacket = require('./packets/inv.js');
exports.GetDataPacket = require('./packets/getdata.js');
exports.NotFoundPacket = require('./packets/notfound.js');
exports.GetBlocksPacket = require('./packets/getblocks.js');
exports.GetHeadersPacket = require('./packets/getheaders.js');
exports.HeadersPacket = require('./packets/headers.js');
exports.SendHeadersPacket = require('./packets/sendheaders.js');
exports.BlockPacket = require('./packets/block.js');
exports.TXPacket = require('./packets/tx.js');
exports.RejectPacket = require('./packets/reject.js');
exports.MempoolPacket = require('./packets/mempool.js');
exports.FilterLoadPacket = require('./packets/filterload.js');
exports.FilterAddPacket = require('./packets/filteradd.js');
exports.FilterClearPacket = require('./packets/filterclear.js');
exports.MerkleBlockPacket = require('./packets/merkleblock.js');
exports.FeeFilterPacket = require('./packets/feefilter.js');
exports.SendCmpctPacket = require('./packets/sendcmpct.js');
exports.CmpctBlockPacket = require('./packets/cmpctblock.js');
exports.GetBlockTxnPacket = require('./packets/getblocktxn.js');
exports.BlockTxnPacket = require('./packets/blocktxn.js');
exports.GetCFiltersPacket = require('./packets/getcfilters.js');
exports.CFilterPacket = require('./packets/cfilter.js');
exports.GetCFHeadersPacket = require('./packets/getcfheaders.js');
exports.CFHeadersPacket = require('./packets/cfheaders.js');
exports.GetCFCheckptPacket = require('./packets/getcfcheckpt.js');
exports.CFCheckptPacket = require('./packets/cfcheckpt.js');
exports.UnknownPacket = require('./packets/unknown.js');
exports.SendDSQueuePacket = require('./packets/senddsq.js');

/**
 * Parse a payload.
 * @param {String} cmd
 * @param {Buffer} data
 * @returns {Packet}
 */

exports.fromRaw = function fromRaw(cmd, data) {
  switch (cmd) {
    case 'version':
      return exports.VersionPacket.fromRaw(data);
    case 'verack':
      return exports.VerackPacket.fromRaw(data);
    case 'ping':
      return exports.PingPacket.fromRaw(data);
    case 'pong':
      return exports.PongPacket.fromRaw(data);
    case 'getaddr':
      return exports.GetAddrPacket.fromRaw(data);
    case 'addr':
      return exports.AddrPacket.fromRaw(data);
    case 'inv':
      return exports.InvPacket.fromRaw(data);
    case 'getdata':
      return exports.GetDataPacket.fromRaw(data);
    case 'notfound':
      return exports.NotFoundPacket.fromRaw(data);
    case 'getblocks':
      return exports.GetBlocksPacket.fromRaw(data);
    case 'getheaders':
      return exports.GetHeadersPacket.fromRaw(data);
    case 'headers':
      return exports.HeadersPacket.fromRaw(data);
    case 'sendheaders':
      return exports.SendHeadersPacket.fromRaw(data);
    case 'block':
      return exports.BlockPacket.fromRaw(data);
    case 'tx':
      return exports.TXPacket.fromRaw(data);
    case 'reject':
      return exports.RejectPacket.fromRaw(data);
    case 'mempool':
      return exports.MempoolPacket.fromRaw(data);
    case 'filterload':
      return exports.FilterLoadPacket.fromRaw(data);
    case 'filteradd':
      return exports.FilterAddPacket.fromRaw(data);
    case 'filterclear':
      return exports.FilterClearPacket.fromRaw(data);
    case 'merkleblock':
      return exports.MerkleBlockPacket.fromRaw(data);
    case 'feefilter':
      return exports.FeeFilterPacket.fromRaw(data);
    case 'sendcmpct':
      return exports.SendCmpctPacket.fromRaw(data);
    case 'cmpctblock':
      return exports.CmpctBlockPacket.fromRaw(data);
    case 'getblocktxn':
      return exports.GetBlockTxnPacket.fromRaw(data);
    case 'blocktxn':
      return exports.BlockTxnPacket.fromRaw(data);
    case 'getcfilters':
      return exports.GetCFiltersPacket.fromRaw(data);
    case 'cfilter':
      return exports.CFilterPacket.fromRaw(data);
    case 'getcfheaders':
      return exports.GetCFHeadersPacket.fromRaw(data);
    case 'cfheaders':
      return exports.CFHeadersPacket.fromRaw(data);
    case 'getcfcheckpt':
      return exports.GetCFCheckptPacket.fromRaw(data);
    case 'cfcheckpt':
      return exports.CFCheckptPacket.fromRaw(data);
    case 'senddsq':
      return exports.SendDSQueuePacket.fromRaw(data);
    default:
      return exports.UnknownPacket.fromRaw(cmd, data);
  }
};

/**
 * Potentially contains block content
 * @param {String|PacketType} packetType - packet type or cmd
 * @returns {Boolean}
 */

exports.isBlockLike = function isBlockLike(packetType) {
  let type;

  if (typeof packetType === 'string')
    type = exports.Types[packetType.toUpperCase()];

  if (typeof packetType === 'number')
    type = packetType;

  assert(type, 'Bad packet type.');

  switch (type) {
    case exports.Types.typesByIndex.BLOCK:
    case exports.Types.typesByIndex.CMPCTBLOCK:
    case exports.Types.typesByIndex.BLOCKTXN:
      return true;
  }

  return false;
}

/**
 * Check if packet is oversized
 * @param {String|PacketType} packetType - packet type or cmd
 * @param {Number} size
 * @param {Number} maxBlockSize
 * @returns {Boolean}
 */

exports.isOversized = function isOversized(packetType, size, maxBlockSize) {
  if (!maxBlockSize)
    maxBlockSize = consensus.MAX_BLOCK_SIZE;

  if (size > common.MAX_MESSAGE && !isBlockLike(packetType))
    return true;

  if (size > 2 * maxBlockSize)
    return true;

  return false;
}
