// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.
const nacl = require('tweetnacl');
const mraeBox = require('../crypto/node/mrae_box');
const LOCAL_KEY = 'me';

/**
 * Keymanager tracks contract keys. It also is responsible for refreshing
 * short-term contract keys as needed through an underlying web3c interface.
 * @param {Web3} web3 The wrapped web3 object for making gateway requests.
 * @param {String} storage Where state should be attempted to be stored.
 */
class KeyManager {
  constructor(web3, storage) {
    if (storage && typeof localStorage !== 'undefined' && localStorage !== null) {
      this._db = localStorage;
    // Note: the dependency on node-localstorage below is removed from the
    // webpack compiled version of the library, which will be running in a
    // browser context.
    /* develblock:start */
    } else if (storage !== undefined) {
      //TODO: allow setting storage location.
      this._db = new require('node-localstorage').LocalStorage(storage);
    /* develblock:end */
    } else {
      this._db = new Map();
      this._db.getItem = this._db.get;
      this._db.setItem = this._db.set;
    }
    this._web3 = web3;
  }

  /**
   * Add a longterm key for a contract to the database.
   * @param {String} address Address The contract Address.
   * @param {String} key EthHex The hex encoding of the longterm key.
   */
  add(address, key) {
    address = address.toLowerCase();
    if (address == LOCAL_KEY) {
      throw new Error('invalid contract address');
    }
    if (this._db.getItem(address) &&
        JSON.parse(this._db.getItem(address)).longterm !== key) {
      throw new Error('refusing to change longterm key for address');
    }
    this._db.setItem(address, JSON.stringify({
      longterm: key
    }));
  }

  /**
   * Check if a contract is registered with the key manager.
   * @param {String} address The address of the contract
   * @return {bool} if the address is in the keymanager database.
   */
  isRegistered(address) {
    if (address == LOCAL_KEY) {
      throw new Error('invald contract address');
    }
    return this._db.getItem(address.toLowerCase()) !== undefined;
  }
  /**
   * Get a short term key for a given contract.
   * @param {String} address Address the contract to request a key for
   * @param {Function} callback Function callback provided either a key or error
   */
  get(address, callback) {
    address = address.toLowerCase();
    if (address == LOCAL_KEY) {
      throw new Error('invalid contract address');
    }
    let data = this._db.getItem(address);
    if (data !== undefined) {
      data = JSON.parse(data);
      // TODO: check timestamp expiry.
      if (data.shorterm) {
        return callback(data.shorterm);
      }
    }
    this._web3.confidential.getPublicKey(address, this.onKey.bind(this, address, callback));
  }

  /**
   * Reset state and flush keys.
   */
  reset() {
    this._db.clear();
  }

  /**
   * Track short term keys in responses to requests made in `get`.
   * @param {String} address EthHex the address of the contract
   * @param {Function} cb The continuation to call on completion with error or key.
   * @param {Error} err If there was an error in the getPublicKey call
   * @param {Object} response the response from the web3 gateway with short term key.
   */
  onKey(address, cb, err, response) {
    if (err !== null) {
      return cb(err);
    }
    address = address.toLowerCase();
    if (address == LOCAL_KEY) {
      throw new Error('invalid contract address');
    }
    let data = this._db.getItem(address);
    if (data === undefined) {
      return cb(response.key);
    }
    data = JSON.parse(data);
    // TODO: check if response is an error.
    // TODO: validate response signature is from lngterm key.
    // TODO: reformat / parse.
    data.shortterm = response.key;
    data.timestamp = response.timestamp;
    this._db.setItem(address, JSON.stringify(data));
    cb(response.key);
  }

  /**
   * Get the local keypair for the client.
   * @private
   * @returns {Object} the local keypair.
   */
  getLocalKeys() {
    let data = this._db.getItem(LOCAL_KEY);
    if (data == undefined) {
      let keypair = nacl.box.keyPair();
      keypair.publicKey = toHex(keypair.publicKey);
      keypair.secretKey = toHex(keypair.secretKey);
      data = JSON.stringify(keypair);
      this._db.setItem(LOCAL_KEY, data);
    }
    return JSON.parse(data);
  }

  /**
   * Get the key for the local client key manager.
   * @private
   * @return {Uint8Array} of local private key.
   */
  getSecretKey() {
    return this.getLocalKeys().secretKey;
  }

  /**
   * Get the public key for the local client key manager.
   * @private
   * @returns {Uint8Array} of local public key.
   */
  getPublicKey() {
    return this.getLocalKeys().publicKey;
  }

  /**
   * Encrypt an EthHex message using an EthHex public key for a contract.
   * @param {String} msg EthHex the message
   * @param {String} key EthHex remote public key.
   * @return {String} EthHex The encrypted message
   */
  async encrypt(msg, key) {
    let nonce = nacl.randomBytes(16);
    let msgBytes = parseHex(msg);
    let pubKey = parseHex(this.getPublicKey());
    let cyphertext = await mraeBox.Seal(nonce, msgBytes, new Uint8Array(), parseHex(key), parseHex(this.getSecretKey()));
    // prepend nonce, pubkey
    let out = new Uint8Array(nonce.length + pubKey.length + cyphertext.length);
    let i = 0;
    for (; i < nonce.length; i++) {
      out[i] = nonce[i];
    }
    for (; i < nonce.length + pubKey.length; i++) {
      out[i] = pubKey[i - nonce.length];
    }
    for (; i < out.length; i++) {
      out[i] = cyphertext[i - (nonce.length + pubKey.length)];
    }
    return toHex(out);
  }

  /**
   * Encrypt an EthHex message with the local private key. Rejects on error.
   * @param {String} msg EthHex the encrypted message
   * @return {String} EthHex The decoded message.
   */
  async decrypt(cyphertext) {
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
    let plaintext = await mraeBox.Open(nonce, msg, new Uint8Array(), pubKey, parseHex(this.getSecretKey()));
    return toHex(plaintext);
  }
}

/**
 * Return a Uint8Array of an ethereum hex-encoded key (EthHex)
 * @param {String} keystring The EthHex encoding of the value
 * @returns {Uint8Array} The byte incoding of the value
 */
function parseHex (keystring) {
  if (keystring.indexOf('0x') === 0) {
    keystring = keystring.substr(2);
  }
  return new Uint8Array(
    keystring.match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16))
  );
}

/**
 * Returns an ethereum hex-encoded key of a Uint8Array
 * @param {Uint8Array} keybytes 
 * @returns {String} The EthHex encoding
 */
function toHex (keybytes) {
  return keybytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');
}


module.exports = KeyManager;
