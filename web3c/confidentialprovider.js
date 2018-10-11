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
  let provider = this.manager.provider;
  // Transformations on intercepted calls.
  if (payload.method == 'confidential_getPublicKey') {
    // TODO: store long-term key in key manager for validation.
  } else if (payload.method == 'eth_sendTransaction') {
    // TODO: encrypt.
  } else if (payload.method == 'eth_call') {
    return this.keymanager.get(payload.params[0].to, (key) => {
      if (typeof key !== 'string') { // error
        return callback(key);
      }
      this.keymanager.encrypt(payload.params[0].data, key).then((cyphertext) => {
        payload.params[0].data = cyphertext;
        provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
      });
    });
  }

  return provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
};

ConfidentialProvider.sendBatch = function confidentialSendBatch (data, callback) {
  // TODO
  return this.manager.sendBatch(data, callback);
};

// TODO: patch responses for decryption.

module.exports = ConfidentialProvider;
