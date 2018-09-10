const Contract = require('web3-eth-contract');

var executePrivateMethod = function executePrivateMethod() {
  
};

var PrivateContract = function PrivateContract(jsonInterface, address, options) {
  var contract = new Contract(jsonInterface, address, options);
  contract._executeMethod = executePrivateMethod;
  return contract;
};

module.exports = PrivateContract;
