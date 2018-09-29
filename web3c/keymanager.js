// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.
const nacl = require('tweetnacl');
const mraeBox = require('../crypto/node/mrae_box');
const encoder = require('text-encoding');

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

  if (!this._db[address]) {
    return callback(new Error('no known contract at requested address'));
  }
  // TODO: check timestamp expiry.
  if (this._db[address].shorterm) {
    return callback(this._db[address].shorterm);
  }
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
function parseKey (keystring) {
  if (keystring.indexOf('0x') === 0) {
    keystring = keystring.substr(2);
  }
  return new Uint8Array(
    keystring.match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16))
  );
}

KeyManager.prototype.encrypt = async function (msg, key, callback) {
  let nonce = nacl.randomBytes(16);

  // in node, the require provides an object containing TextEncoder.
  let enc = encoder;
  if (encoder.TextEncoder) {
    enc = encoder.TextEncoder;
  }
  let msgBytes = new enc().encode(msg);

  let cyphertext = await mraeBox.Seal(nonce, msgBytes, new Uint8Array(), parseKey(key), this.getSecretKey());

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
  callback(cyphertext);
};

KeyManager.prototype.onKey = function (address, cb, err, response) {
  if (err !== null) {
    return cb(err);
  }
  address = address.toLowerCase();

  if (!this._db[address]) {
    return cb(new Error('Recieved key for unregistered address'));
  }
  // TODO: check if response is an error.
  // TODO: validate response signature is from lngterm key.
  // TODO: reformat / parse.
  this._db[address].shortterm = response.key;
  this._db[address].timestamp = response.timestamp;
  cb(response.key);
};

module.exports = KeyManager;
