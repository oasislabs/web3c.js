// This file provides the "web3.confidential" exported interface
const ConfidentialProvider = require('./confidential_provider');
const KeyManager = require('./key_manager');
const Signer = require('./signer');

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

    // Deployed contracts are instantiated with clone.
    // This patch keeps those clones confidential.
    this.clone = () => {
      return new ConfidentialContract(this.options.jsonInterface, this.options.address, this.options);
    };

    if (options && options.key) {
      keymanager.add(address, options.key);
    }

    // Hook deploy so that we can pass in the Oasis contract deployment header
    // as an extra argument. For example, contract.deploy({ data, header: { expiry } });
    // To do this, we need to also hook into all the methods available on the returned
    // tx object so that we can pass in such deploy options into them.
    this.deploy = (deployOptions, callback) => {
      deployOptions = Object.assign({}, deployOptions);
      // Create the txObject that we want to patch and return.
      let txObject = c.deploy.call(this, deployOptions, callback);

      // Methods we want to hook into.
      let _send = txObject.send;
      let _estimateGas = txObject.estimateGas;

      // Perform patches.
      txObject.send = (options) => {
        options = Object.assign({}, options);
        options.header = deployOptions.header;
        return _send.call(this, options);
      };
      txObject.estimateGas = (options) => {
        options = Object.assign({}, options);
        options.header = deployOptions.header;
        return _estimateGas.call(this, options);
      };

      // Return the patched object.
      return txObject;
    };

    // Setup expiry method. Note: input to this function must be positive integer.
    let expiry = new web3.extend.Method({
      name: 'expiry',
      call: 'oasis_getExpiry',
      params: 1,
      inputFormatter: [(address) => {
        if (!address) {
          address = this.options.address;
        }
        return web3.extend.formatters.inputAddressFormatter(address);
      }],
      outputFormatter: (res) => res
    });
    expiry.setRequestManager(web3._requestManager);
    expiry.attachToObject(this);
  };

  this.resetKeyManager = () => {
    this.keyManager.reset();
  };
};

function getPublicKeyOutputFormatter (t) {
  let signer = new Signer(KeyManager.publicKey());
  let err = signer.verify(t.signature, t.public_key, t.timestamp);
  if (err) {
    throw err;
  }
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
