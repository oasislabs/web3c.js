// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.
const nacl = require('tweetnacl');
const bytes = require('./bytes');
const Signer = require('./signer');
const LOCAL_KEY = 'me';

/**
 * Keymanager tracks contract keys. It also is responsible for refreshing
 * short-term contract keys as needed through an underlying web3c interface.
 * @param {Web3} web3 The wrapped web3 object for making gateway requests.
 * @param {localStorage?} storageProvider where Storage should be persisted.
 * @param {MraeBox} mraeBox The class used to perform mrae encryption.
 * @param {Object?} signer is an optional parameter to validate signatures
 *                  with custom logic, e.g., for testing.
 */
class KeyManager {
  constructor(web3, storageProvider, mraeBox, signer) {
    if (storageProvider !== undefined) {
      this._db = storageProvider;
    } else {
      this._db = new Map();
      this._db.getItem = this._db.get;
      this._db.setItem = this._db.set;
    }
    this._web3 = web3;
    this._mraeBox = mraeBox;
    if (signer === undefined) {
      this.signer = new Signer(KeyManager.publicKey());
    } else {
      this.signer = signer;
    }
  }

  /**
   * Trys to add a longterm key for a contract to the database.
   *
   * @param  {String} address the contract address.
   * @param  {String} key the long-term public key to add.
   * @param  {Number?} timestamp the optional timestamp representing the key's expiry.
   * @param  {String} signature the key manager's signature over the key and optional
   *         timestamp.
   *
   * @throws {Error} if the signature is malformed.
   */
  tryAdd(addressHex, keyHex, timestamp, signatureHex) {
    let err = this.signer.verify(signatureHex, keyHex, timestamp);
    if (err === null) {
      this.add(addressHex, keyHex);
    }
    return err;
  }

  /**
   * Add a longterm key for a contract to the database.
   * @param {String} address Address The contract Address.
   * @param {String} key EthHex The hex encoding of the longterm key.
   */
  add(address, key) {
    address = address.toLowerCase();
    if (address === LOCAL_KEY) {
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
   * @param {Function} callback Function callback take two parameters (error, key).
   */
  get(address, callback) {
    address = address.toLowerCase();
    if (address == LOCAL_KEY) {
      throw new Error('invalid contract address');
    }
    let data = this._db.getItem(address);
    if (data !== undefined && data) {
      data = JSON.parse(data);
      // TODO: check timestamp expiry.
      if (data && data.shorterm) {
        return callback(null, data.shorterm);
      }
    }
    this._web3.oasis.getPublicKey(address, this.onKey.bind(this, address, callback));
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
    if (err) {
      return cb(err);
    }
    address = address.toLowerCase();
    if (address == LOCAL_KEY) {
      throw new Error('invalid contract address');
    }
    // No public key since `address` is not confidential.
    if (!response) {
      return cb(null, response);
    }
    if (typeof response.public_key !== 'string') {
      response.public_key = bytes.toHex(response.public_key);
    }

    let data = this._db.getItem(address);
    if (data === undefined || data == null) {
      return cb(null, response.public_key);
    }
    data = JSON.parse(data);
    // TODO: check if response is an error.
    // TODO: reformat / parse.
    err = this.signer.verify(response.signature, response.public_key, response.timestamp);
    if (err) {
      cb(err);
    }
    data.shortterm = response.public_key;
    data.timestamp = response.timestamp;
    this._db.setItem(address, JSON.stringify(data));
    cb(null, response.public_key);
  }

  /**
   * Get the local keypair for the client.
   * @private
   * @returns {Object} the local keypair.
   */
  getLocalKeys() {
    let data = this._db.getItem(LOCAL_KEY);
    if (data == undefined || data == null) {
      let keypair = nacl.box.keyPair();
      keypair.publicKey = bytes.toHex(keypair.publicKey);
      keypair.secretKey = bytes.toHex(keypair.secretKey);
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
    let msgBytes = bytes.parseHex(msg);
    let pubKey = bytes.parseHex(this.getPublicKey());
    let cyphertext = await this._mraeBox.Seal(nonce, msgBytes, new Uint8Array(), bytes.parseHex(key), bytes.parseHex(this.getSecretKey()));
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
    return bytes.toHex(out);
  }

  /**
   * Encrypt an EthHex message with the local private key. Rejects on error.
   * @param {String} cyphertext EthHex the encrypted message
   * @return {String} EthHex The decoded message.
   */
  async decrypt(cyphertext) {
    if (!cyphertext || cyphertext == '0x') {
      return cyphertext;
    }
    let cypherBytes = bytes.parseHex(cyphertext);
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
    let plaintext = await this._mraeBox.Open(nonce, msg, new Uint8Array(), pubKey, bytes.parseHex(this.getSecretKey()));
    return bytes.toHex(plaintext);
  }

  /**
   * Length in bytes of public keys.
   */
  static publicKeyLength() {
    return 32;
  }
  /**
   * Length in bytes of signatures.
   */
  static signatureLength() {
    return 64;
  }

  /**
   * Public key associated with the *remote* dummy key manager.
   */
  static publicKey() {
    return "0x51d5e24342ae2c4a951e24a2ba45a68106bcb7986198817331889264fd10f1bf";
  }
}

module.exports = KeyManager;
