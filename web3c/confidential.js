// This file provides the "web3.confidential" exported interface
const Ceth = require('./ceth');

const Confidential = function (web3) {
  this._requestManager = web3._requestManager;

  let self = this;

  Confidential.methods(web3._extend).forEach(function (method) {
    method.attachToObject(self);
  });

  let ceth = new Ceth(web3.eth);
  self.contract = ceth.contract;
};

function getPublicKeyOutputFormatter (t) {
  return t;
}

function callOutputFormatter (t) {
  return t;
}

Confidential.methods = function (ctx) {
  return [
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
