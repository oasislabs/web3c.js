/* globals Web3 */
let MraeBox = undefined;
if (typeof window === 'undefined' ) {
  MraeBox = require('../crypto/node/mrae_box');
} else {
  MraeBox = require('../crypto/subtle/mrae_box');
}

const Oasis = require('./oasis');

let localWeb3 = undefined;

// These are over-ridden by module.exports.Promise below.
let resolveWeb3 = () => {};
let rejectWeb3 = () => {};

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 *
 * @param {Object} provider is an object conforming to the web3 provider interface.
 * @param {Object?} web3 is an optional web3 object to override the localWeb3.
 */
module.exports = function (provider, web3) {
  if (web3) {
    localWeb3 = web3;
  }

  let storage = undefined;
  if (typeof localStorage !== 'undefined') {
    storage = localStorage;
  }

  localWeb3.call(this, provider);
  if (this.version && !this.version.api) { // v1.0 series
    this.oasis = new Oasis(this, storage, MraeBox);
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
} else if (typeof define !== 'undefined' && typeof require.ensure !== 'undefined') {
  // webpack
  require.ensure(['web3'], function(require) {
    localWeb3 = require('web3');
    resolveWeb3(module.exports);
  }, rejectWeb3, 'web3');
} else {
  require('./index.es6').then(web3 => {
    localWeb3 = web3;
    resolveWeb3(module.exports);
  }).catch(rejectWeb3);
}
