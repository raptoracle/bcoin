/*!
 * layout.js - blockchain data layout for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2024, the raptoracle developers (MIT License).
 * https://github.com/raptoracle/bcoin
 */

'use strict';

const bdb = require('bdb');

/*
 * Database Layout:
 *   V -> db version
 *   O -> chain options
 *   R -> tip hash
 *   D -> versionbits deployments
 *   e[hash] -> entry
 *   h[hash] -> height
 *   H[height] -> hash
 *   n[hash] -> next hash
 *   p[hash] -> tip index
 *   b[hash] -> block (deprecated)
 *   t[hash] -> extended tx (deprecated)
 *   c[hash] -> coins
 *   u[hash] -> undo coins (deprecated)
 *   v[bit][hash] -> versionbits state
 *   T[addr-hash][hash] -> dummy (tx by address) (deprecated)
 *   C[addr-hash][hash][index] -> dummy (coin by address) (deprecated)
 *   s[timestamp] -> height
 *   S[height] -> timestamp
 */

const layout = {
  V: bdb.key('V'),
  O: bdb.key('O'),
  R: bdb.key('R'),
  D: bdb.key('D'),
  e: bdb.key('e', ['hash256']),
  h: bdb.key('h', ['hash256']),
  H: bdb.key('H', ['uint32']),
  n: bdb.key('n', ['hash256']),
  p: bdb.key('p', ['hash256']),
  b: bdb.key('b', ['hash256']),
  t: bdb.key('t', ['hash256']),
  c: bdb.key('c', ['hash256', 'uint32']),
  z: bdb.key('z', ['hash256', 'uint32']),
  u: bdb.key('u', ['hash256']),
  v: bdb.key('v', ['uint8', 'hash256']),
  T: bdb.key('T', ['hash', 'hash256']),
  C: bdb.key('C', ['hash', 'hash256', 'uint32']),
  s: bdb.key('s', ['uint32']),
  S: bdb.key('S', ['uint32']),
};

/**
 * Raptoreum Database Layout
 * /src/txdb.cpp
 * 
 * C -> coin
 * c -> coins
 * f -> block files
 * t -> txindex
 * a -> address index
 * u -> unspent index
 * s -> timestamp index
 * p -> spent index
 * n -> future index
 * b -> block index
 * 
 * B -> best block
 * H -> head blocks
 * F -> flag
 * R -> reindex flag
 * l -> last block
 */


/*
 * Expose
 */

module.exports = layout;
