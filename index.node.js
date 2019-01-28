// Web3c
const Confidential = require('./web3c/confidential');
const Web3 = require('web3');
const localStorage = require('node-localstorage');
const MraeBox = require('./crypto/node/mrae_box');

/**
 * Web3c is a wrapper that can be invoked in the same way as Web3.
 * Expects Web3 v1.0
 */
module.exports = class Web3C extends Web3 {
  constructor(provider, net, options = {}) {
    super(provider, net, options);
    let storage = new localStorage.LocalStorage('.web3c');
    this.confidential = new Confidential(this, storage, MraeBox);  
  }
};
