const KeyManager = require('./key_manager');
const DeployHeader = require('./deploy_header');

/**
 * ConfidentialProvider resolves calls from a Web3.eth.Contract, in particular
 * `eth_sendTransaction` and `eth_call`, and transforms them into confidential
 * transactions and calls.
 */
class ConfidentialProvider {
  /**
   * Create a new confidential provider.
   * @param {KeyManager} keymanager The key manager holding the local keypair and
   *     tracking keypair information about the remote contract.
   * @param {web3.RequestManager} internalManager The underlying manager for sending
   *     transactiosn to a web3 gateway.
   */
  constructor(keymanager, internalManager) {
    this.outstanding = [];
    this.keymanager = keymanager;
    this.manager = internalManager;
    this.addSubscription = internalManager.addSubscription.bind(internalManager);
    this.removeSubscription = internalManager.removeSubscription.bind(internalManager);
    this.clearSubscriptions = internalManager.clearSubscriptions.bind(internalManager);
  }

  /**
   * send will take calls from a web3 component, wrap them in a secure channel,
   * and pass them to the underlying inernalManager.
   * @param payload Object The web3 call payload.
   * @param callback Function The function to call with the result.
   */
  send(payload, callback) {
    let transform = new ConfidentialSendTransform(this.manager.provider, this.keymanager);
    if (payload.method === 'eth_sendTransaction') {
      transform.ethSendTransaction(payload, callback, this.outstanding);
    }
    else if (payload.method == 'eth_call') {
      transform.ethCall(payload, callback);
    }
    else if (payload.method == 'eth_getLogs') {
      transform.ethLogs(payload, callback);
    }
    else if (payload.method == 'eth_getTransactionReceipt') {
      transform.ethTransactionReceipt(payload, callback, this.outstanding);
    }
    else if (payload.method == 'eth_estimateGas') {
      transform.ethEstimateGas(payload, callback);
    }
    else {
      const provider = this.manager.provider;
      return provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
    }
  }
  sendBatch(data, callback) {
    // TODO
    return this.manager.sendBatch(data, callback);
  }

  /**
   * @param   {String} logData is the first log upon creation of a confidential
   *          contract. It is of the form PUBLIC_KEY || Sign(PUBLIC_KEY).
   * @returns {Object} with the signature and public key as properties.
   * @throws  {Error} if logData is not a hex string of the specified form.
   */
  static splitConfidentialDeployLog(logData) {
    // 0x + len(publicKey) + len(signature).
    let expectedLength = 2 + KeyManager.publicKeyLength()*2 + KeyManager.signatureLength()*2;
    if (logData.length !== expectedLength) {
      throw Error(`Deploy log is malformed: ${logData}`);
    }
    let pk = logData.substr(0, KeyManager.publicKeyLength()*2 + 2);
    let signature = '0x' + logData.substr(KeyManager.publicKeyLength()*2 + 2);
    return [pk, signature];
  }
}



/**
 * Wrap transactions in a confidential channel.
 */
class ConfidentialSendTransform {
  constructor(provider, keymanager) {
    this.provider = provider;
    this.keymanager = keymanager;
  }

  ethEstimateGas(payload, callback) {
    return this.ethSendTransaction(payload, callback, undefined);
  }

  /**
   * @param {Object} payload The JSON rpc request being intercepted. Contains the transaction.
   * @param {Function} callback The function to call with the error and result.
   * @param {Array?} outstanding The collection of deployed transaction hashes.
   */
  ethSendTransaction(payload, callback, outstanding) {
    const tx = payload.params[0];
    if (!tx.to) {
      if (tx.header) {
        tx.data = DeployHeader.write(tx.header, tx.data);
      }
      return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, (err, res) => {
        if (!err && outstanding !== undefined) {
          // track deploy txn hashes to trust them in transaction receipts.
          outstanding.push(res.result);
        }
        callback(err, res);
      });
    }
    this.encryptTx(tx, (err) => {
      if (err) {
        return callback(err);
      }
      this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
    });
  }

  /**
   *
   * @param {Array} logs The Eth logs to trial decrypt
   * @param {bool} tryAdd Look for longterm contract deploy keys to add to
   *     to the key manager.
   * @returns {Array} [logs, Error]. If success, error is null;
   */
  async tryDecryptLogs(logs, tryAdd) {
    let err = null;
    for (let i = 0; i < logs.length; i++) {
      if (tryAdd && logs[i].logIndex == 0 && logs[i].topics &&
          logs[i].topics[0] == '0x' + 'f'.repeat(64)) {
        let [publicKey, signature] = ConfidentialProvider.splitConfidentialDeployLog(logs[i].data);
        err = this.keymanager.tryAdd(logs[i].address, publicKey, undefined, signature);
      } else {
        try {
          let plain = await this.keymanager.decrypt(logs[i].data);
          logs[i].data = plain;
        } catch (e) {
          // not a log for us.
        }
      }
    }
    return [logs, err];
  }

  ethLogs(payload, callback) {
    return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, async (err, res) => {
      if (!err) {
        let [logs, decryptError] = await this.tryDecryptLogs(res.result, false);
        res.result = logs;
        err = decryptError;
      }
      callback(err, res);
    });
  }

  ethTransactionReceipt(payload, callback, outstanding) {
    let tryAdd = outstanding.indexOf(payload.params[0]) > -1;
    return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, async (err, res) => {
      if (!err && res.result && res.result.logs && res.result.logs.length) {
        let [logs, decryptError] = await this.tryDecryptLogs(res.result.logs, tryAdd);
        res.result.logs = logs;
        err = decryptError;
      }
      callback(err, res);
    });
  }

  //TODO: eth_getFilterChanges, eth_getFilterLogs

  ethCall(payload, callback) {
    const tx = payload.params[0];
    this.encryptTx(tx, (err) => {
      if (err) {
        return callback(err);
      }
      payload.method = 'confidential_call_enc';
      this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, (err, resp) => {
        if (!resp.result || err) {
          callback(err, resp);
        }
        this.keymanager.decrypt(resp.result).then((plaintext) => {
          resp.result = plaintext;
          callback(err, resp);
        }).catch((err) => {
          callback(err, null);
        });
      });
    });
  }

  /**
   * Mutates the given tx by encrypting the data field and prepending
   * the unique confidential identifier.
   * @param tx Object The eth transaction.
   * @param callback Function
   */
  encryptTx(tx, callback) {
    return this.keymanager.get(tx.to, (key) => {
      if (typeof key !== 'string') { // error
        return callback(key);
      }
      this.keymanager.encrypt(tx.data, key).then((cyphertext) => {
        tx.data = cyphertext;
        callback();
      });
    });
  }
}


module.exports = ConfidentialProvider;
// expose for testing
module.exports.private = {
  OASIS_PREFIX,
  ConfidentialSendTransform
};
