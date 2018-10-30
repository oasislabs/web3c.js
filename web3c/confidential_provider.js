/**
 * Hex representation of b'\0pri'.
 */
const CONFIDENTIAL_PREFIX = '00707269';

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
      transform.ethTransactionReciept(payload, callback, this.outstanding);
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
      // deploy transaction doesn't encrypt anything for v0.5
      tx.data = this._prependConfidential(tx.data);
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
   */
  async tryDecryptLogs(logs, tryAdd) {
    for (let i = 0; i < logs.length; i++) {
      if (tryAdd && logs[i].logIndex == 0 && logs[i].topics &&
          logs[i].topics[0] == '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') {
        this.keymanager.add(logs[i].address, logs[i].data);
      } else {
        try {
          let plain = await this.keymanager.decrypt(logs[i].data);
          logs[i].data = plain;
        } catch (e) {
          // not a log for us.
        }
      }
    }
    return logs;
  }

  ethLogs(payload, callback) {
    return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, async (err, res) => {
      if (!err) {
        res.result = await this.tryDecryptLogs(res.result, false);
      }
      callback(err, res);
    });
  }

  ethTransactionReciept(payload, callback, outstanding) {
    let tryAdd = outstanding.indexOf(payload.params[0]) > -1;
    return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, async (err, res) => {
      if (!err && res.result && res.result.logs && res.result.logs.length) {
        res.result.logs = await this.tryDecryptLogs(res.result.logs, tryAdd);
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
        if (!resp.result) {
          callback(err, resp);
        }
        this.keymanager.decrypt(resp.result).then((plaintext) => {
          resp.result = plaintext;
          callback(err, resp);
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

  /**
   * Only prepends the CONFIDENTIAL_PREFIX to the given data if it doesn't already exist.
   */
  _prependConfidential(bytesHex) {
    if (bytesHex.length < CONFIDENTIAL_PREFIX.length ||
        bytesHex.substr(0, CONFIDENTIAL_PREFIX.length) !== CONFIDENTIAL_PREFIX) {
      return '0x' + CONFIDENTIAL_PREFIX + bytesHex.substr(2);
    }
    return bytesHex;
  }
}

module.exports = ConfidentialProvider;
