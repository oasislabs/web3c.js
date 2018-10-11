// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.
const nacl = require('tweetnacl');
const mraeBox = require('../crypto/node/mrae_box');

function KeyManager (web3) {
  this._db = new Map();
  this._web3 = web3;
}

KeyManager.prototype.add = function (address, key) {
  this._db[address.toLowerCase()] = {
    longterm: key
  };
};

KeyManager.prototype.isRegistered = function (address) {
  return (address in this._db);
};

KeyManager.prototype.get = function (address, callback) {
  address = address.toLowerCase();

  if (this._db[address]) {
    // TODO: check timestamp expiry.
    if (this._db[address].shorterm) {
      return callback(this._db[address].shorterm);
    }
  }

  // always get the key if there is no long term key since we don't fetch it
  // from the deploy responses at the moment. todo: oasislabs/web3c.js#27
  this._web3.confidential.getPublicKey(address, this.onKey.bind(this, address, callback));
};

KeyManager.prototype.getSecretKey = function () {
  if (!this.secretKey) {
    let keypair = nacl.box.keyPair();
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  return this.secretKey;
};

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

KeyManager.prototype.encrypt = async function (msg, key) {
  let nonce = nacl.randomBytes(16);
  let msgBytes = parseHex(msg);

  let cyphertext = await mraeBox.Seal(nonce, msgBytes, new Uint8Array(), parseHex(key), this.getSecretKey());

  // prepend nonce, pubkey
  let out = new Uint8Array(nonce.length + this.publicKey.length + cyphertext.length);
  let i = 0;
  for (; i < nonce.length; i++) {
    out[i] = nonce[i];
  }
  for (; i < nonce.length + this.publicKey.length; i++) {
    out[i] = this.publicKey[i - nonce.length];
  }
  for (; i < out.length; i++) {
    out[i] = cyphertext[i - (nonce.length + this.publicKey.length)];
  }
  return out.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');
};

KeyManager.prototype.decrypt = async function (cyphertext) {
  let cypherBytes = parseHex(cyphertext);

  // split nonce, pubkey, msg
  let nonce = new Uint8Array(16);
  let pubKey = new Uint8Array(32);
  let msg = new Uint8Array(cypherBytes.length - nonce.length - pubKey.length);
  let i = 0;
  for (; i < nonce.length; i++) {
    nonce[i] = cypherBytes[i];
  }
  for (; i < nonce.length + pubKey.length; i++) {
    pubKey[i - nonce.length] = cypherBytes[i];
  }
  for (; i < cypherBytes.length; i++) {
    msg[i - nonce.length - pubKey.length] = cypherBytes[i];
  }

  let plaintext = await mraeBox.Open(nonce, msg, new Uint8Array(), pubKey, this.getSecretKey());
  return plaintext.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');
};

KeyManager.prototype.onKey = function (address, cb, err, response) {
  if (err !== null) {
    return cb(err);
  }

  address = address.toLowerCase();

  // early exit if there is no long term key since we don't fetch it
  // from the deploy responses at the moment. todo: oasislabs/web3c.js#27
  if (!this._db[address]) {
    return cb(response.key);
  }
  // TODO: check if response is an error.
  // TODO: validate response signature is from lngterm key.
  // TODO: reformat / parse.
  this._db[address].shortterm = response.key;
  this._db[address].timestamp = response.timestamp;

  cb(response.key);
};

module.exports = KeyManager;
