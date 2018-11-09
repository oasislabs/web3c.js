/**
 * Hex representation of b'\0enc'.
 */
const CONFIDENTIAL_PREFIX = '00656e63';

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
          logs[i].topics[0] == '0x' + 'f'.repeat(64)) {
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

  ethTransactionReceipt(payload, callback, outstanding) {
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

  /**
   * Only prepends the CONFIDENTIAL_PREFIX to the given data if it doesn't already exist.
   * Otherwise, returns the data without modification. Assumes bytesHex is a hex encoded
   * byte string.
   *
   * Background:
   *
   * It is an invariant that, if b'\0enc' exists as a prefix to the data field in a
   * CREATE tx, then those four bytes are *not* part of the data field, and are used
   * *only* to tag confidentiality.
   *
   * _prependConfidential is only called if there is no `to` address in the transaction.
   * This means we are forming a CREATE transaction to create a contract. In this case,
   * it is never the case that b'\0enc' will be a valid prefix to initcode, and this is
   * also the case with WASM contracts (having the four byte prefix b'\0asm'). As a
   * result, we don't need to prepend the prefix a second time, if it already exists. If
   * it exists, we can assume its being used to mark a contract as confidential.
   *
   * Now, one may wonder how or why we would ever receive input that already has the
   * b'\0enc' prefix. This may happen because we want to support the following features
   * all at the same time:
   *
   * - truffle compile (with confidential prefix automatically added for any files named
   *   confidential_*)
   * - truffle migrate (to perform the deploy)
   * - web3c.js deploy (using the compiled artifact from truffle compile)
   *
   * The migration and deploy features are interchangeable. And its nice that they can
   * use the same compiled bytecode.
   *
   * If we remove this prefix check and always prepend the 4 byte prefix, then web3c.js
   * deploy will break when using our extended truffle compile, because it will have two
   * sets of prefixes--and so the receiving code will strip off one prefix, and then fail
   * to execute the initcode correctly because it starts with \0enc.
   */
  _prependConfidential(bytesHex) {
    if (!bytesHex.startsWith('0x')) {
      return bytesHex;
    }
    // + 2 to account for the hex prefix '0x'
    if (bytesHex.length >= CONFIDENTIAL_PREFIX.length + 2 &&
        bytesHex.substr(2, CONFIDENTIAL_PREFIX.length) === CONFIDENTIAL_PREFIX) {
      return bytesHex;
    }

    return '0x' + CONFIDENTIAL_PREFIX + bytesHex.substr(2);
  }
}


module.exports = ConfidentialProvider;
// expose for testing
module.exports.private = { CONFIDENTIAL_PREFIX, ConfidentialSendTransform };
