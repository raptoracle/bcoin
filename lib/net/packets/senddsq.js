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
 * SendDSQueue Packet
 * @extends Packet
 */

class SendDSQueuePacket extends Packet {
  /**
   * Create a `senddsq` packet.
   * @constructor
   */

  constructor() {
    super();
    this.cmd = 'senddsq';
    this.type = Types.typesByIndex.SENDDSQUEUE;
  }

  /**
   * Instantiate senddsq packet from buffer reader.
   * @param {BufferReader} br
   * @returns {SendDSQueuePacket}
   */

  static fromReader(br) {
    return new this().fromReader(br);
  }

  /**
   * Instantiate senddsq packet from serialized data.
   * @param {Buffer} data
   * @param {String?} enc
   * @returns {SendDSQueuePacket}
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

module.exports = SendDSQueuePacket;
