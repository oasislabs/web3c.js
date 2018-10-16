/* globals Web3 */
const Confidential = require('./confidential');

let localWeb3 = undefined;

/**
 * Web3c is a wrapper that can be invocated in the same way as Web3.
 * Expects Web3 v1.0
 */
module.exports = function (provider) {
  localWeb3.call(this, provider);
  if (this.version && !this.version.api) { // v1.0 series
    this.confidential = new Confidential(this);
  } else {
    throw new Error('Unexpected web3 version. Web3c Expects Web3 1.0');
  }
};

if (typeof Web3 !== 'undefined') {
  localWeb3 = Web3;
} else if (typeof define !== 'undefined') {
  // webpack
  require.ensure(['web3'], function(require) {
    localWeb3 = require('web3');
  }, function(err) {
    throw err;
  }, 'web3');
/* develblock:start */
} else {
  localWeb3 = require('web3');
/* develblock:end */
}
