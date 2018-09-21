const PrivateContract = function (web3) {
  this._requestManager = web3._requestManager;

  let self = this;

  self.methods(web3._extend).forEach(function (method) {
    method.attachToObject(self);
  });
};

function getPublicKeyOutputFormatter (t) {
  return t;
}

function sendRawTransactionOutputFormatter (t) {
  return t;
}

function callOutputFormatter (t) {
  return t;
}

PrivateContract.methods = function (ctx) {
  return [
    new ctx.Method({
      name: 'getPublicKey',
      call: 'confidential_getPublicKey',
      params: 1,
      inputFormatter: [ctx.formatters.inputAddressFormatter],
      outputFormatter: getPublicKeyOutputFormatter
    }),
    new ctx.Method({
      name: 'sendRawTransaction',
      call: 'confidential_sendRawTransaction_enc',
      params: 1,
      inputFormatter: [null],
      outputFormatter: sendRawTransactionOutputFormatter
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

module.exports = PrivateContract;
