/* globals Web3 */
const Confidential = require('./confidential');
const MraeBox = require('../crypto/subtle/mrae_box');

let localWeb3 = undefined;

// These are over-ridden by module.exports.Promise below.
let resolveWeb3 = () => {};
let rejectWeb3 = () => {};

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 */
module.exports = function (provider) {
  localWeb3.call(this, provider);
  if (this.version && !this.version.api) { // v1.0 series
    this.confidential = new Confidential(this, localStorage, MraeBox);
  } else {
    throw new Error('Unexpected web3 version. Web3c Expects Web3 1.0');
  }
};

/**
 * Web3.Promise provides a hook for ensuring the library is fully used,
 * for instances where it will need to asynchronously require web3
 * internally.
 */
module.exports.Promise = new Promise((resolve, reject) => {
  resolveWeb3 = resolve;
  rejectWeb3 = reject;
});

// Option 1: At load time, the web3c webpack module finds an existing,
// compatible version of Web3 in the global namespace. We wrap the existing
// web3.
if (typeof Web3 !== 'undefined' && (new Web3()).version && !(new Web3()).version.api) {
  localWeb3 = Web3;
  resolveWeb3(module.exports);
// Option 2: At load time, the webpack module does not find web3.
// Require.ensure allows loading the bundled, compiled version of web3 as
// as a separate browser request, with the downside that it is asynchronous,
// and means that `new web3c()` will not be functional immediately.
} else if (typeof define !== 'undefined') {
  // webpack
  require.ensure(['web3'], function(require) {
    localWeb3 = require('web3');
    resolveWeb3(module.exports);
  }, function(err) {
    rejectWeb3(err);
  }, 'web3');
}
