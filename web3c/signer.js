const nacl = require('tweetnacl');
const hash = require('js-sha512').sha512_256;
const bytes = require('./bytes');

/**
 * Given public key, a signer can verify web3c signatures over public keys from the public key.
 */
class Signer {

  constructor(publicKey) {
    this.publicKey = publicKey;
  }

  /**
   * Ensures the signature is Sign_{key_manager}(hash(longTermKey || timestamp)).
   *
   * @param  {String} signatureHex is a hex string signature of keyHex || timestamp.
   * @param  {String} keyHex is a hex string of the long term public key.
   * @param  {Number?} timestamp is the timestamp at which the key expires.
   * @returns {Error} if signature !== Sign_{KEY_MANAGER_PUBLIC_KEY}(longTermKey || timestamp).
   *          Otherwise returns null.
   */
  verify(signatureHex, keyHex, timestamp) {
    let signature = bytes.parseHex(signatureHex);
    let longTermKey = bytes.parseHex(keyHex);
    let predigest;
    if (timestamp !== undefined) {
      let timestampArray = bytes.parseNumber(timestamp, 8);
      predigest = new Uint8Array(longTermKey.length + timestampArray.length);
      predigest.set(longTermKey);
      predigest.set(timestampArray, longTermKey.length);
    } else {
      predigest = longTermKey;
    }
    const digest = bytes.parseHex(hash(predigest));
    let publicKey = bytes.parseHex(this.publicKey);
    if (!nacl.sign.detached.verify(digest, signature, publicKey)) {
      return new Error(`invalid signature for key/timestamp/signature: ${longTermKey}/${timestamp}/${signature} with key manager: ${this.publicKey}`);
    }
    return null;
  }
}

module.exports = Signer;
