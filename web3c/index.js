/* globals Web3 */
const Oasis = require('./oasis');

let localWeb3 = undefined;

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 *
 * @param {Object} provider is an object conforming to the web3 provider interface.
 * @param {Object?} web3 is an optional web3 object to override localWeb3.
 * @param {String} options is a set of options containing configurations to web3c.
 *                 Currently the only key is keyManagerPublicKey, an optional hex
 *                 string to configure the remote key manager for signature validation.
 */
module.exports = function (provider, web3, options) {
  if (web3) {
    localWeb3 = web3;
  }
  localWeb3.call(this, provider);

  if (!this.version || this.version.api) {
    throw new Error('Unexpected web3 version. Web3c Expects Web3 1.0');
  }

  this.oasis = new Oasis(buildOptions(this, options));
};

/**
 * Builds Oasis options.
 * @param {Object}  web3 is the underlying web3 object to use.
 * @param {Object?} options is the configuration
 * @returns         the options used to construct the Oasis namespace.
 */
function buildOptions(web3, options) {
  options = options || {};

  options.web3 = web3;

  if (!options.mraebox) {
    if (typeof window === 'undefined' ) {
      options.mraebox = require('../crypto/node/mrae_box');
    } else {
      options.mraebox = require('../crypto/subtle/mrae_box');
    }
  }

  if (!options.storage) {
    if (typeof localStorage !== 'undefined') {
      options.storage = localStorage;
    }
  }

  return options;
}

// These are over-ridden by module.exports.Promise below.
let resolveWeb3 = () => {};
let rejectWeb3 = () => {};

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
