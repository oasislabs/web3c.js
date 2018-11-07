// This file provides the "web3.confidential" exported interface
const ConfidentialProvider = require('./confidential_provider');
const KeyManager = require('./key_manager');

/**
 * Confidential
 * This module exports the `web3.confidential` namespace. It defines the
 * parameters of the raw underlying web3 methods added to the web3 protocol,
 * and exposes the confidential contract interface by creating a
 * web3.eth.Contract communication through a ConfidentialProvider.
 */
const Confidential = function (web3, storage, mraebox) {
  this.keyManager = new KeyManager(web3, storage, mraebox);
  let provider = new ConfidentialProvider(this.keyManager, web3._requestManager);
  Confidential.methods(web3.extend).forEach((method) => {
    method.setRequestManager(web3._requestManager);
    method.attachToObject(this);
  });

  // Save `this` so that we can refer to it and its properties inside `ConfidentialContract`. 
  // Otherwise `this` is overridden when `new` is used in `new Contract`.
  let self = this;
  /**
   * web3.confidential.Contract behaves like web3.eth.Contract.
   * @param {Object} abi
   * @param {String} address
   * @param {Object} options
   * @param {String} options.key The longterm key of the contract.
   * @param {bool}   options.saveSession false to disable storing keys.
   */
  this.Contract = function ConfidentialContract(abi, address, options) {
    let c = new web3.eth.Contract(abi, address, options);
    // Copy the wrapped contract to `this`.
    Object.assign(this, c);
    this.__proto__ = c.__proto__;

    // Object.DefineProperty's are not copied otherwise.
    this.defaultAccount = c.constructor.defaultAccount;
    this.defaultBlock = c.constructor.defaultBlock || 'latest';

    let instanceProvider = provider;

    let keymanager = self.keyManager;
    if (options && options.saveSession === false) {
      keymanager = new KeyManager(web3, undefined, mraebox);
      instanceProvider = new ConfidentialProvider(keymanager, web3._requestManager);
    }

    c.setProvider.call(this, instanceProvider);


    let boundEvent = c._decodeEventABI;
    this._decodeEventABI = function (data) {
      if (data.logIndex == 0 && data.topics &&
          data.topics[0] == '0x' + 'f'.repeat(64)) {
        keymanager.add(data.address, data.data);
      } else {
        // decoding happens in the confidential provider.
      }
      return boundEvent.call(this, data);
    };

    // Deployed contracts are instantiated with clone.
    // This patch keeps those clones confidential.
    this.clone = () => {
      return new ConfidentialContract(this.options.jsonInterface, this.options.address, this.options);
    };

    if (options && options.key) {
      keymanager.add(address, options.key);
    }
  };

  this.resetKeyManager = () => {
    this.keyManager.reset();
  };
};

function getPublicKeyOutputFormatter (t) {
  return t;
}

function callOutputFormatter (t) {
  return t;
}

Confidential.methods = function (ctx) {
  return [
    // Second parameter - the long-term key - is intercepted by the provider.
    new ctx.Method({
      name: 'getPublicKey',
      call: 'confidential_getPublicKey',
      params: 1,
      inputFormatter: [ctx.formatters.inputAddressFormatter],
      outputFormatter: getPublicKeyOutputFormatter
    }),
    new ctx.Method({
      name: 'call',
      call: 'confidential_call_enc',
      params: 2,
      inputFormatter: [ctx.formatters.inputCallFormatter, ctx.formatters.inputDefaultBlockNumberFormatter],
      outputFormatter: callOutputFormatter
    }),
  ];
};

module.exports = Confidential;
