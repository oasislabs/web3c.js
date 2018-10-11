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

  const provider = this.manager.provider;

  let tx = payload.params[0];
  // Transformations on intercepted calls.
  if (payload.method === "eth_sendTransaction") {
	if (!tx.to) {
	  // deploy transaction doesn't encrypt anything for v0.5
	  tx.data = prependConfidential(tx.data);
	  return provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
	}
	encryptTx.call(this, tx, callback, (encryptedTx) => {
	  encryptedTx.data = prependConfidential(encryptedTx.data);
	  provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
	});
  } else if (payload.method == 'eth_call') {
	encryptTx.call(this, tx, callback, (tx) => {
	  payload.method = "confidential_call_enc";
	  tx.data = prependConfidential(tx.data);
	  provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, (err, resp) => {
		this.keymanager.decrypt(resp.result).then((plaintext) => {
		  resp.result = plaintext;
		  callback(err, resp);
		});
	  });
	});
  } else {
	return provider[provider.sendAsync ? 'sendAsync' : 'send'](payload, callback);
  }
};

ConfidentialProvider.sendBatch = function confidentialSendBatch (data, callback) {
  // TODO
  return this.manager.sendBatch(data, callback);
};

function encryptTx(tx, callback, completionFn) {
  return this.keymanager.get(tx.to, (key) => {
    if (typeof key !== 'string') { // error
      return callback(key);
    }
    this.keymanager.encrypt(tx.data, key).then((cyphertext) => {
      tx.data = cyphertext;
	  completionFn(tx);
    });
  });
}

function prependConfidential(bytes_hex) {
  return "0x" + Buffer.from('confidential', 'utf8').toString('hex') + bytes_hex.substr(2);
}

// TODO: patch responses for decryption.

module.exports = ConfidentialProvider;

// Return a Uint8Array of an ethereum hex-encoded key
function parseHex (keystring) {
  if (keystring.indexOf('0x') === 0) {
    keystring = keystring.substr(2);
  }
  return new Uint8Array(
    keystring.match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16))
  );
}
