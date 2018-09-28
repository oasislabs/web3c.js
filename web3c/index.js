/* globals Web3 */
const Confidential = require('./confidential');

let localWeb3 = undefined;

module.exports = function (provider) {
  localWeb3.call(this, provider);
  if (this.version && !this.version.api) { // v1.0 series
    this.confidential = new Confidential(this);
  } else {
    throw new Error('Unexpected web3 version');
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
