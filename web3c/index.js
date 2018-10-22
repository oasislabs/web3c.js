/* globals Web3 */
const Confidential = require('./confidential');

let localWeb3 = undefined;

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
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

// Option 1: At load time, the web3c webpack module finds an existing,
// compatible version of Web3 in the global namespace. We wrap the existing
// web3.
if (typeof Web3 !== 'undefined' && (new Web3()).version && !(new Web3()).version.api) {
  localWeb3 = Web3;
// Option 2: At load time, the webpack module does not find web3.
// Require.ensure allows loading the bundled, compiled version of web3 as
// as a separate browser request, with the downside that it is asynchronous,
// and means that `new web3c()` will not be functional immediately.
} else if (typeof define !== 'undefined') {
  // webpack
  require.ensure(['web3'], function(require) {
    localWeb3 = require('web3');
  }, function(err) {
    throw err;
  }, 'web3');
// Option 3: Node or other uncompiled instantiations will directly require the
// web3 dependency. The `develblock` comment is removed by webpack, allowing
// its compiler to understand that the dependency is only loaded through a
// require.ensure and as such should be compiled into a separate module.
/* develblock:start */
} else {
  localWeb3 = require('web3');
/* develblock:end */
}
