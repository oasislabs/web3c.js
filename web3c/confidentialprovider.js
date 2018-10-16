/**
 * Hex representation of b'\0pri'.
 */
const CONFIDENTIAL_PREFIX = '00707269';

/**
 * ConfidentialProvider resolves calls from a Web3.eth.Contract, in particular
 * `eth_sendTransaction` and `eth_call`, and transforms them into confidential
 * transactions and calls.
 * @param keymanager KeyManager The key manager holding the local keypair and
 *     tracking keypair information about the remote contract.
 * @param internalManager web3.RequestManager The underlying manager for sending
 *     transactiosn to a web3 gateway.
 */
function ConfidentialProvider (keymanager, internalManager) {
  return {
    send: ConfidentialProvider.send.bind({
      keymanager: keymanager,
      manager: internalManager,
    }),
    sendBatch: ConfidentialProvider.sendBatch.bind({
      keymanager: keymanager,
      manager: internalManager,
    }),
    addSubscription: internalManager.addSubscription.bind(internalManager),
    removeSubscription: internalManager.removeSubscription.bind(internalManager),
    clearSubscriptions: internalManager.clearSubscriptions.bind(internalManager),
  };
}

/**
 * send will take calls from a web3 component, wrap them in a secure channel,
 * and pass them to the underlying inernalManager.
 * @param payload Object The web3 call payload.
 * @param callback Function The function to call with the result.
 */
ConfidentialProvider.send = function confidentialSend (payload, callback) {
  let transform = new ConfidentialSendTransform(this.manager.provider, this.keymanager);

  if (payload.method === 'eth_sendTransaction') {
    transform.ethSendTransaction(payload, callback);
  } else if (payload.method == 'eth_call') {
    transform.ethCall(payload, callback);
  } else {
    const provider = this.manager.provider;
    return provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
  }
};

ConfidentialProvider.sendBatch = function confidentialSendBatch (data, callback) {
  // TODO
  return this.manager.sendBatch(data, callback);
};

/**
 * Wrap transactions in a confidential channel.
 */
class ConfidentialSendTransform {
  constructor(provider, keymanager) {
    this.provider = provider;
    this.keymanager = keymanager;
  }

  ethSendTransaction(payload, callback) {
    const tx = payload.params[0];
    if (!tx.to) {
      // deploy transaction doesn't encrypt anything for v0.5
      tx.data = this.prependConfidential(tx.data);
      // TODO: recover long-term key from tx receipt if present.
      return this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
    }
    this.encryptTx(tx, (err) => {
      if (err) {
        return callback(err);
      }
      this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
    });
  }

  // TODO: get call data signed by the user wallet
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

  prependConfidential(bytesHex) {
    return '0x' + CONFIDENTIAL_PREFIX + bytesHex.substr(2);
  }
}

module.exports = ConfidentialProvider;
