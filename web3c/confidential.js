// This file provides the "web3.confidential" exported interface
const ConfidentialProvider = require('./confidentialprovider');
const KeyManager = require('./keymanager');

/**
 * Confidential
 * This module exports the `web3.confidential` namespace. It defines the
 * parameters of the raw underlying web3 methods added to the web3 protocol,
 * and exposes the confidential contract interface by creating a
 * web3.eth.Contract communication through a ConfidentialProvider.
 */
const Confidential = function (web3) {
  this.keyManager = new KeyManager(web3);
  let confidentialShim = ConfidentialProvider(this.keyManager, web3._requestManager);
  Confidential.methods(web3.extend).forEach((method) => {
    method.setRequestManager(web3._requestManager);
    method.attachToObject(this);
  });

  this.Contract = (abi, address, options) => {
    let c = new web3.eth.Contract(abi, address, options);
    c.setProvider(confidentialShim);

    // hook to ensure deployed contracts retain the confidential provider.
    let boundClone = c.clone.bind(c);
    c.clone = () => {
      let cloned = boundClone();
      cloned.setProvider(confidentialShim);
      return cloned;
    };

    if (options && options.key) {
      this.keyManager.add(address, options.key);
    }

    return c;
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
