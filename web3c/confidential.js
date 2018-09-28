// This file provides the "web3.confidential" exported interface
const ConfidentialProvider = require('./confidentialprovider');
const KeyManager = require('./keymanager');

const Confidential = function (web3) {
  this.keyManager = new KeyManager(web3);
  let confidentialShim = ConfidentialProvider(this.keyManager, web3._requestManager);
  Confidential.methods(web3.extend).forEach((method) => {
    method.setRequestManager(confidentialShim);
    method.attachToObject(this);
  });

  this.Contract = web3.eth.Contract;
  this.Contract.setProvider(confidentialShim);
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
      params: 2,
      inputFormatter: [ctx.formatters.inputAddressFormatter, (t) => t],
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
