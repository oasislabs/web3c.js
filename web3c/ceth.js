// A shim for web3.eth, which transforms calls to call and
// sendTransaction to add encryption.
const KeyManager = require('./keymanager');

function Ceth (eth) {
  this.keyManager = new KeyManager();

  // calls to Ceth.contract() should route calls back through the shim.
  let boundContract = eth.contract.bind(this);
  this.contract = function (abi) {
    let inst = boundContract(abi);
    let boundAt = inst.at.bind(inst);
    // TODO: handle confidential creation via an update .new() method.
    inst.at = (address, callback, key) => {
      this.keyManager.add(address, key);
      return boundAt(address, callback);
    }
    return inst;
  }

  this._requestManager = eth._requestManager;
  this._eth = eth;

  // Note: will need to change for hidden contract code.
  this.getCode = eth.getCode.bind(eth);
  // Note: does receipt need to be decrypted?
  this.getTransactionReceipt = eth.getTransactionReceipt.bind(eth);
  this.estimateGas = eth.estimateGas.bind(eth);
  this.filter = eth.estimateGas.bind(eth);

  return this;
}

Ceth.prototype.sendTransaction = function (options, callback) {
  // TODO: encrypt data
  this.eth.sendTransaction(options, callback);
};

Ceth.prototype.call = function (options, block, callback) {
  // TODO: encrypt data.
  this.eth.call(options, block, callback);
};

module.exports = Ceth;
