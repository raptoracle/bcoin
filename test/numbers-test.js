const BN = require('bcrypto/lib/bn');
const assert = require('bsert');
const consensus = require('../lib/protocol/consensus');
// Amount compression:
// * If the amount is 0, output 0
// * first, divide the amount (in base units) by the largest power of 10 possible; call the exponent e (e is max 9)
// * if e<9, the last digit of the resulting number cannot be 0; store it as d, and drop it (divide by 10)
//   * call the result n
//   * output 1 + 10*(9*n + d - 1) + e
// * if e==9, we only know the resulting number is not zero, so output 1 + 10*(n - 1) + 9
// (this is decodable, as d is in [1-9] and e is in [0-9])

function compressValue(value) {
  if (value === 0)
    return 0;

  let exp = 0;
  while (value % 10 === 0 && exp < 9) {
    value /= 10;
    exp++;
  }

  if (exp < 9) {
    const last = value % 10;
    value = (value - last) / 10;
    return 1 + 10 * (9 * value + last - 1) + exp;
  }

  return 10 + 10 * (value - 1);
}

/**
 * Decompress value.
 * @param {Number} value - Compressed value.
 * @returns {Amount} value
 */

function decompressValue(value) {
  if (value === 0)
    return 0;

  value--;

  let exp = value % 10;

  value = (value - exp) / 10;

  let n;
  if (exp < 9) {
    const last = value % 9;
    value = (value - last) / 9;
    n = value * 10 + last + 1;
  } else {
    n = value + 1;
  }

  while (exp > 0) {
    n *= 10;
    exp--;
  }

  return n;
}

//const currentValue = Number(9007287999999992);
//const previousMaxSafe = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991n

//console.log(compressValue(currentValue));

//console.log("Output : " + Number.isSafeInteger(Number(compressValue(currentValue))));


console.log(Number(BigInt(2)));
