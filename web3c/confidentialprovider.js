// This file encrypts web3c calls as a request manager wrapping shim.

function ConfidentialProvider (keymanager, provider) {
  return {
    send: ConfidentialProvider.send.bind({
      keymanager: keymanager,
      boundSend: provider.send.bind(provider)
    }),
    sendBatch: ConfidentialProvider.sendBatch.bind({
      keymanager: keymanager,
      boundSend: provider.sendBatch.bind(provider)
    }),
    addSubscription: provider.addSubscription.bind(provider),
    removeSubscription: provider.removeSubscription.bind(provider),
    clearSubscriptions: provider.clearSubscriptions.bind(provider),
  };
}

ConfidentialProvider.send = function confidentialSend (payload, callback) {
  // Transformations on intercepted calls.
  if (payload.method == 'confidential_getPublicKey') {
    // TODO: store long-term key in key manager for validation.
  } else if (payload.method == 'eth_sendTransaction') {
    // TODO: encrypt.
  } else if (payload.method == 'eth_call') {
    // TODO: encrypt.
  }

  return this.boundSend(payload, callback);
};

ConfidentialProvider.sendBatch = function confidentialSendBatch (data, callback) {
  // TODO
  return this.boundSend(data, callback);
};

// TODO: patch responses for decryption.

module.exports = ConfidentialProvider;
