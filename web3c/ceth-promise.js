// A shim for web3.eth, which transforms calls to call and
// sendTransaction to add encryption.
// For web3 1.0
const KeyManager = require('./keymanager');

function Ceth (eth) {
  this.keyManager = new KeyManager();
  this._requestManager = eth._requestManager;
  this._eth = eth;

  let boundContract = eth.Contract.bind(this);

  this.Contract = function (abi) {
    let inst = boundContract(abi);
    let boundAt = inst.at.bind(inst);
    // TODO: handle confidential creation via an update .new() method.
    inst.at = (address, callback, key) => {
      this.keyManager.add(address, key);
      return boundAt(address, callback);
    }
    return inst;
  }

  // Note: will need to change for hidden contract code.
  this.getCode = eth.getCode.bind(eth);
  // Note: does receipt need to be decrypted?
  this.getTransactionReceipt = eth.getTransactionReceipt.bind(eth);
  this.estimateGas = eth.estimateGas.bind(eth);
  this.filter = eth.estimateGas.bind(eth);
}

Ceth.prototype.send = function (options, callback) {
  // TODO: encrypt data
  this._eth.send(options, callback);
};

Ceth.prototype.sendTransaction = function (options, callback) {
  // TODO: encrypt data
  this._eth.sendTransaction(options, callback);
};

Ceth.prototype.call = function (options, block, callback) {
  // TODO: encrypt data.
  this._eth.call(options, block, callback);
};

module.exports = Ceth;
