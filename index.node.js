// Web3c
const web3 = require('web3');
const localStorage = require('node-localstorage');
const Oasis = require('./web3c/oasis');
/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 */
module.exports = function (provider, web3Override, options) {
  if (web3Override) {
    web3Override.call(this, provider);
  } else {
    web3.call(this, provider);
  }

  this.oasis = new Oasis(buildOptions(this, options));
};

/**
 * Builds the Oasis options.
 * @param {Object}  web3 is the underlying web3 object to use.
 * @param {Object?} options is the configuration
 * @returns         the options used to construct the Oasis namespace.
 */
function buildOptions(web3, options) {
  options = options || {};

  options.web3 = web3;

  if (!options.storage) {
	options.storage = new localStorage.LocalStorage('.web3c');
  }
  if (!options.mraebox) {
	options.mraebox = require('./crypto/node/mrae_box');
  }

  return options;
}
