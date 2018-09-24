// A shim for web3.eth, which transforms calls to call and
// sendTransaction to add encryption.
const KeyManager = require('./keymanager');

let Ceth = function (eth) {
  let self = this;

  self.keyManager = new KeyManager();

  // calls to Ceth.contract() should route calls back through the shim.
  let boundContract = eth.contract.bind(self);
  self.contract = function (abi) {
    let inst = boundContract(abi);
    let boundAt = inst.at.bind(inst);
    // TODO: handle confidential creation via an update .new() method.
    inst.at = function (address, callback, key) {
      self.keyManager.add(address, key);
      return boundAt(address, callback);
    };
    return inst;
  }

  self._requestManager = eth._requestManager;
  self._eth = eth;

  // Note: will need to change for hidden contract code.
  self.getCode = eth.getCode.bind(eth);
  // Note: does receipt need to be decrypted?
  self.getTransactionReceipt = eth.getTransactionReceipt.bind(eth);
  self.estimateGas = eth.estimateGas.bind(eth);
  self.filter = eth.estimateGas.bind(eth);

  return self;
};

Ceth.prototype.sendTransaction = function (options, callback) {
  // TODO: encrypt data
  this.eth.sendTransaction(options, callback);
};

Ceth.prototype.call = function (options, block, callback) {
  // TODO: encrypt data.
  this.eth.call(options, block, callback);
};

module.exports = Ceth;
