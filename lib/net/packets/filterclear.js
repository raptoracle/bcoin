/*!
 * packets.js - packets for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';
const Packet = require('./packet');
const Types = require('./types');

/**
 * FilterClear Packet
 * @extends Packet
 */

class FilterClearPacket extends Packet {
  /**
   * Create a `filterclear` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'filterclear';
    this.type = Types.typesByIndex.FILTERCLEAR;
  }

  /**
   * Instantiate filterclear packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {FilterClearPacket}
   */

  static fromRaw(data, enc) {
    if (typeof data === 'string')
      data = Buffer.from(data, enc);
    return new this().fromRaw(data);
  }
}

/*
 * Expose
 */

module.exports = FilterClearPacket;
