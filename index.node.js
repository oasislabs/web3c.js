// Web3c
const Confidential = require('./web3c/confidential');
const web3 = require('web3');
const localStorage = require('node-localstorage');
const MraeBox = require('./crypto/node/mrae_box');

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 */
module.exports = function (provider) {
  web3.call(this, provider);
  let storage = new localStorage.LocalStorage('.web3c');
  this.confidential = new Confidential(this, storage, MraeBox);
};
