/**
 * Hex representation of b'\0pri'.
 */
const CONFIDENTIAL_PREFIX = '00707269';

// This file encrypts web3c calls as a request manager wrapping shim.
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
 * Transforms intercepted eth rpc sends into confidential rpc sends.
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
    this.encryptTx(tx, callback, () => {
      this.provider[this.provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
    });
  }

  // TODO: get call data signed by the user wallet
  ethCall(payload, callback) {
    const tx = payload.params[0];
    this.encryptTx(tx, callback, () => {
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
   */
  encryptTx(tx, callback, completionFn) {
    return this.keymanager.get(tx.to, (key) => {
      if (typeof key !== 'string') { // error
        return callback(key);
      }
      this.keymanager.encrypt(tx.data, key).then((cyphertext) => {
        tx.data = this.prependConfidential(cyphertext);
        completionFn();
      });
    });

  }

  prependConfidential(bytesHex) {
    return '0x' + CONFIDENTIAL_PREFIX + bytesHex.substr(2);
  }
}

module.exports = ConfidentialProvider;
