let PrivateContract = function (web3) {
  this._requestManager = web3._requestManager;

  let self = this;

  self.methods(web3._extend).forEach(function (method) {
    method.attachToObject(self);
  });
};

let getPublicKeyOutputFormatter = function getPublicKeyOutputFormatter(t) {
  return t;
};

PrivateContract.methods = function (ctx) {
  return [
    new ctx.Method({
      name: 'getPublicKey',
      call: 'con_getPublicKey',
      params: 1,
      inputFormatter: [ctx.formatters.inputAddressFormatter],
      outputFormatter: getPublicKeyOutputFormatter
    })
  ];
};

module.exports = PrivateContract;
