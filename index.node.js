// Web3c
const Web3 = require('web3');
const Oasis = require('./web3c/oasis');
const utils = require('./web3c/utils');
/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 */
class Web3c {
  constructor (provider, Web3Override, options) {
    if (Web3Override) {
      Web3Override.call(this, provider);
    } else {
      Web3.call(this, provider);
    }

    this.oasis = new Oasis(buildOptions(this, options));
  }
}

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
    const localStorage = require('node-localstorage');
    options.storage = new localStorage.LocalStorage('.web3c');
  }
  if (!options.mraebox) {
    options.mraebox = require('./crypto/node/mrae_box');
  }

  return options;
}

utils.web3CopyMethods(Web3c, Web3);

module.exports = Web3c;
