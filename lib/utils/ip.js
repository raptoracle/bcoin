/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

const bio = require('bufio');
//var constants = require('../primitives/common').constants;
const serviceRegex =
  /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/;
const ipV6prefix = Buffer.from('00000000000000000000ffff', 'hex');
const emptyAddress = Buffer.alloc(18);
const EMPTY_IPV6_ADDRESS = '[0:0:0:0:0:0:0:0]:0';
const EMPTY_IPV4_ADDRESS = '0.0.0.0:0';
const IP_ADDRESS_SIZE = 16;
const ipAddresses = {
  IPV4MAPPEDHOST: 16,
  PORT: 2,
};

/**
 * Maps ipv4:port to ipv6 buffer and port
 * Note: this is made mostly for the deterministic masternode list, which are ipv4 addresses encoded as ipv6 addresses
 * @param {string} string
 * @return {Buffer}
 */
function ipAndPortToBuffer(string) {
  if (isZeroAddress(string)) {
    return emptyAddress.slice();
  }
  if (!isIpV4(string)) {
    throw new Error('Only serialization of ipv4 and zero ipv6 is allowed');
  }
  var addressParts = string.split(':');
  var addressBytes = addressParts[0].split('.').map(function (byte) {
    return Number(byte);
  });
  var port = Number(addressParts[1]);

  var bufferWriter = bio.write();
  bufferWriter.writeVarBytes(ipV6prefix);
  bufferWriter.writeVarBytes(Buffer.from(addressBytes));
  bufferWriter.writeU16BE(port);
  return bufferWriter.render();
}

/**
 * Parses ipv6 buffer and port to ipv4:port string
 * @param {Buffer} buffer
 * @return {string}
 */
function bufferToIPAndPort(buffer) {
  if (buffer.length !== 18) {
    throw new Error('Ip buffer has wrong size. Expected size is 18 bytes');
  }
  let bufferReader = bio.read(buffer);
  var ipV6Buffer = bufferReader.readBytes(IP_ADDRESS_SIZE);
  var port = bufferReader.readU16BE();
  // To get ipv4 bytes, we need to ignore first 12 bytes of ipv6
  var ipV4DecimalBytes = Array.prototype.slice.call(ipV6Buffer.slice(12, 16));
  var ipV4string = ipV4DecimalBytes.join('.');
  var serviceString = ipV4string + ':' + String(port);
  // This is a hack to match core implementation, which in case of an empty address returns ipv6 string
  serviceString = isZeroAddress(serviceString)
    ? EMPTY_IPV6_ADDRESS
    : serviceString;
  return serviceString;
}

/**
 * Checks if string is an ipv4 address
 * @param {string} ipAndPortString
 * @return {boolean}
 */
function isIpV4(ipAndPortString) {
  return serviceRegex.test(ipAndPortString);
}

/**
 * @param {string} address
 * @return {boolean}
 */
function isZeroAddress(address) {
  return address === EMPTY_IPV6_ADDRESS || address === EMPTY_IPV4_ADDRESS;
}

var ip = {
  isIPV4: isIpV4,
  ipAndPortToBuffer: ipAndPortToBuffer,
  bufferToIPAndPort: bufferToIPAndPort,
  isZeroAddress: isZeroAddress,
  IP_AND_PORT_SIZE:
    ipAddresses.IPV4MAPPEDHOST + ipAddresses.PORT,
};

module.exports = ip;
