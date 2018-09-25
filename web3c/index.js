/* globals Web3 */
const Confidential = require('./confidential');

function makeWeb3c (web3) {
  return function (provider) {
    let obj = new web3(provider);
    if (obj.version.api !== undefined) { // v0.2 serios
      obj.confidential = new Confidential(obj, false);
    } else if (obj.version) { // v1.0 series
      obj.confidential = new Confidential(obj, true);
    } else {
      throw new Error('Unexpected web3 version');
    }
    return obj;
  }
}

if (typeof Web3 === 'undefined' && typeof require.ensure !== 'undefined') {
  // Webpack
  require.ensure(['web3'], function (req) {
    const web3 = req('web3');
    module.exports = makeWeb3c(web3);
  }, function (err) {
    throw err;
  }, 'web3');
/* develblock:start */
} else if (typeof Web3 === 'undefined') {
  // Node.js
  let web3 = require('web3');
  module.exports = makeWeb3c(web3);
/* develblock:end */
} else {
  // Pre-included in browser.
  module.exports = makeWeb3c(Web3);
}
