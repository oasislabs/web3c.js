const DeployHeader = require('./deploy_header');
const ProviderConfidentialBackend = require('./provider_confidential_backend');

class OasisProvider {

  constructor(keyManager, internalManager) {
    this.keyManager = keyManager,
    this.internalManager = internalManager;
    this.backend = new Promise((resolve) => this.backendPromise = resolve);
  }

  send(payload, callback) {
    this.backend.then((provider) => provider.send(payload, callback));
  }

  /**
   * Configures the provider to be confidential or not based upon deployOptions.
   *
   * @param {Object} header is the json body of the Oasis contract deploy header.
   * @returns the new backend that is being used.
   */
  getBackend(header) {
    // Confidential is not present in the header so default to confidential.
    if (!header || !Object.keys(header).includes('confidential')) {
      return new ProviderConfidentialBackend(this.keyManager, this.internalManager);
    } else if (header.confidential) {
      return new ProviderConfidentialBackend(this.keyManager, this.internalManager);
    }
    return new ProviderPlaintextBackend(this.internalManager);
  }

  selectBackend(header) {
    if (!this.backendPromise) {
      throw new Error('Cannot change confidentiality of an existing contract.');
    }
    this.backendPromise(this.getBackend(header));
    this.backendPromise = false;
    return this.backend;
  }
}


class ProviderPlaintextBackend {

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

    try {
      this.addOasisDeployHeader(tx);
    } catch (err) {
      return callback(err, null);
    }

    return this.manager.provider[
      this.manager.provider.sendAsync ? 'sendAsync' : 'send'
    ](payload, (err, res) => {
      callback(err, res);
    });
  }

  addOasisDeployHeader(tx) {
    if (!tx.to) {
      if (tx.header) {
        if (tx.header.confidential) {
          throw new Error(`Cannot specify a confidential header with the plaintext backend ${tx.header}`);
        }
        tx.data = DeployHeader.deployCode(tx.header, tx.data);
      }
      // Need to delete the header from the request since it's not a valid part of the web3 rpc spec.
      delete tx.header
    }
  }
}

module.exports = OasisProvider;
