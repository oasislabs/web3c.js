const ContractFactory = require('./contract_factory');
const DeployHeader = require('./deploy_header');

/**
 * Patched web3.eth namespace to provided extended functionality, such as the ability
 * to specify the contract deploy header on web3.eth.Contract objects.
 */
class Eth {
  constructor(web3) {
    Object.assign(this, web3.eth);
    this.__proto__ = web3.__proto__;
    this.Contract = ContractFactory.make(web3, (options) => {
	  return new EthContractProvider(web3._requestManager);
	});
  }
}

class EthContractProvider {

  constructor(internalManager) {
    this.manager = internalManager;
  }

  send(payload, callback) {
    if (payload.method === 'eth_sendTransaction') {
      return this.ethSendTransaction(payload, callback);
    } else if (payload.method == 'eth_estimateGas') {
      return this.ethSendTransaction(payload, callback);
    }
    return this.manager.provider[
      this.manager.provider.sendAsync ? 'sendAsync' : 'send'
    ](payload, callback);
  }

  ethSendTransaction(payload, callback) {
    let tx = payload.params[0];
    if (!tx.to) {
      if (tx.header) {
        tx.data = DeployHeader.deployCode(tx.header, tx.data);
      }
      // Need to delete the header from the request since it's not a valid part of the web3 rpc spec.
      delete tx.header
    }
    return this.manager.provider[
      this.manager.provider.sendAsync ? 'sendAsync' : 'send'
    ](payload, (err, res) => {
      callback(err, res);
    });
  }

}

module.exports = Eth;
