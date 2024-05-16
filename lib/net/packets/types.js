/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

/**
 * Packet types.
 * @enum {Number}
 * @default
 */

exports.typesByIndex = {
  VERSION: 0,
  VERACK: 1,
  ADDR: 2,
  INV: 3,
  GETDATA: 4,
  MERKLEBLOCK: 5,
  GETBLOCKS: 6,
  GETHEADERS: 7,
  TX: 8,
  HEADERS: 9,
  BLOCK: 10,
  GETADDR: 11,
  MEMPOOL: 12,
  PING: 13,
  PONG: 14,
  NOTFOUND: 15,
  FILTERLOAD: 16,
  FILTERADD: 17,
  FILTERCLEAR: 18,
  REJECT: 19,
  SENDHEADERS: 20,
  SENDCMPCT: 21,
  CMPCTBLOCK: 22,
  GETBLOCKTXN: 23,
  BLOCKTXN: 24,
  // Raptoreum message types
  LEGACYTXLOCKREQUEST: 25,
  SPORK: 26,
  GETSPORKS: 27,
  DSACCEPT: 28,
  DSVIN: 29,
  DSFINALTX: 30,
  DSSIGNFINALTX: 31,
  DSCOMPLETE: 32,
  DSSTATUSUPDATE: 33,
  DSTX: 34,
  DSQUEUE: 35,
  SENDDSQUEUE: 36,
  SYNCSTATUSCOUNT: 37,
  MNGOVERNANCESYNC: 38,
  MNGOVERNANCEOBJECT: 39,
  MNGOVERNANCEOBJECTVOTE: 40,
  GETMNLISTDIFF: 41,
  MNLISTDIFF: 42,
  QSENDRECSIGS: 43,
  QFCOMMITMENT: 44,
  QCONTRIB: 45,
  QCOMPLAINT: 46,
  QJUSTIFICATION: 47,
  QPCOMMITMENT: 48,
  QWATCH: 49,
  QSIGSESANN: 50,
  QSIGSHARESINV: 51,
  QGETSIGSHARES: 52,
  QBSIGSHARES: 53,
  QSIGREC: 54,
  QSIGSHARE: 55,
  QGETDATA: 56,
  QDATA: 57,
  CLSIG: 58,
  ISLOCK: 59,
  MNAUTH: 60,
  // Internal
  UNKNOWN: 61,
  INTERNAL: 62,
  DATA: 63
};


/**
 * Packet types by command.
 * @const {Object}
 * @default
 */

exports.typesByCmd = {
  VERSION: 'version',
  VERACK: 'verack',
  ADDR: 'addr',
  INV: 'inv',
  GETDATA: 'getdata',
  MERKLEBLOCK: 'merkleblock',
  GETBLOCKS: 'getblocks',
  GETHEADERS: 'getheaders',
  TX: 'tx',
  HEADERS: 'headers',
  BLOCK: 'block',
  GETADDR: 'getaddr',
  MEMPOOL: 'mempool',
  PING: 'ping',
  PONG: 'pong',
  NOTFOUND: 'notfound',
  FILTERLOAD: 'filterload',
  FILTERADD: 'filteradd',
  FILTERCLEAR: 'filterclear',
  REJECT: 'reject',
  SENDHEADERS: 'sendheaders',
  SENDCMPCT: 'sendcmpct',
  CMPCTBLOCK: 'cmpctblock',
  GETBLOCKTXN: 'getblocktxn',
  BLOCKTXN: 'blocktxn',
  // Raptoreum message types
  LEGACYTXLOCKREQUEST: 'ix',
  SPORK: 'spork',
  GETSPORKS: 'getsporks',
  DSACCEPT: 'dsa',
  DSVIN: 'dsi',
  DSFINALTX: 'dsf',
  DSSIGNFINALTX: 'dss',
  DSCOMPLETE: 'dsc',
  DSSTATUSUPDATE: 'dssu',
  DSTX: 'dstx',
  DSQUEUE: 'dsq',
  SENDDSQUEUE: 'senddsq',
  SYNCSTATUSCOUNT: 'ssc',
  MNGOVERNANCESYNC: 'govsync',
  MNGOVERNANCEOBJECT: 'govobj',
  MNGOVERNANCEOBJECTVOTE: 'govobjvote',
  GETMNLISTDIFF: 'getmnlistd',
  MNLISTDIFF: 'mnlistdiff',
  QSENDRECSIGS: 'qsendrecsigs',
  QFCOMMITMENT: 'qfcommit',
  QCONTRIB: 'qcontrib',
  QCOMPLAINT: 'qcomplaint',
  QJUSTIFICATION: 'qjustify',
  QPCOMMITMENT: 'qpcommit',
  QWATCH: 'qwatch',
  QSIGSESANN: 'qsigsesann',
  QSIGSHARESINV: 'qsigsinv',
  QGETSIGSHARES: 'qgetsigs',
  QBSIGSHARES: 'qbsigs',
  QSIGREC: 'qsigrec',
  QSIGSHARE: 'qsigshare',
  QGETDATA: 'qgetdata',
  QDATA: 'qdata',
  CLSIG: 'clsig',
  ISLOCK: 'islock',
  MNAUTH: 'mnauth',
    // Internal
  UNKNOWN: 'unknown',
  INTERNAL: 'internal',
  DATA: 'data'
};


/**
 * Packet types by value.
 * @const {Object}
 * @default
 */

exports.typesByVal = [
  'VERSION',
  'VERACK',
  'ADDR',
  'INV',
  'GETDATA',
  'MERKLEBLOCK',
  'GETBLOCKS',
  'GETHEADERS',
  'TX',
  'HEADERS',
  'BLOCK',
  'GETADDR',
  'MEMPOOL',
  'PING',
  'PONG',
  'NOTFOUND',
  'FILTERLOAD',
  'FILTERADD',
  'FILTERCLEAR',
  'REJECT',
  'SENDHEADERS',
  'SENDCMPCT',
  'CMPCTBLOCK',
  'GETBLOCKTXN',
  'BLOCKTXN',
  // Raptoreum message types
  // NOTE: do NOT include non-implmented here, we want them to be "Unknown command" in ProcessMessage()
  'LEGACYTXLOCKREQUEST',
  'SPORK',
  'GETSPORKS',
  'SENDDSQUEUE',
  'DSACCEPT',
  'DSVIN',
  'DSFINALTX',
  'DSSIGNFINALTX',
  'DSCOMPLETE',
  'DSSTATUSUPDATE',
  'DSTX',
  'DSQUEUE',
  'SYNCSTATUSCOUNT',
  'MNGOVERNANCESYNC',
  'MNGOVERNANCEOBJECT',
  'MNGOVERNANCEOBJECTVOTE',
  'GETMNLISTDIFF',
  'MNLISTDIFF',
  'QSENDRECSIGS',
  'QFCOMMITMENT',
  'QCONTRIB',
  'QCOMPLAINT',
  'QJUSTIFICATION',
  'QPCOMMITMENT',
  'QWATCH',
  'QSIGSESANN',
  'QSIGSHARESINV',
  'QGETSIGSHARES',
  'QBSIGSHARES',
  'QSIGREC',
  'QSIGSHARE',
  'QGETDATA',
  'QDATA',
  'CLSIG',
  'ISLOCK',
  'MNAUTH',
  'UNKNOWN',
  'INTERNAL',
  'DATA'
];

/**
 * Unsupported packet types.
 * @const {Object}
 * @default
 */

exports.unsupportedTypes = [
  'DSACCEPT',
];
