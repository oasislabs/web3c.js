/* globals TextEncoder */
const nacl = require('tweetnacl');
const subtle = window.crypto.subtle;
const sivCtr = require('./siv_ctr');

var boxKDFTweak = new TextEncoder('utf-8').encode('MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128');

module.exports = {
  Seal: async function(Nonce, Plaintext, AdditionalData, PeerPublicKey, PrivateKey) {
    var PreMasterKey = nacl.scalarMult(PrivateKey, PeerPublicKey);

    var HMACKey = await subtle.importKey(
      'raw', boxKDFTweak, {
        name: 'HMAC',
        hash: {name: 'SHA-384'}
      },
      false,
      ['sign']
    );
    var AesKey = await subtle.sign(
      {name: 'HMAC'},
      HMACKey,
      PreMasterKey
    );
    PreMasterKey = undefined;

    return sivCtr.Encrypt(AesKey, Nonce, Plaintext, AdditionalData);
  },

  Open: async function(Nonce, Ciphertext, AdditionalData, PeerPublicKey, PrivateKey) {
    var PreMasterKey = nacl.scalarMult(PrivateKey, PeerPublicKey);

    let HMACKey = await subtle.importKey(
      'raw', boxKDFTweak, {
        name: 'HMAC',
        hash: {name: 'SHA-384'}
      },
      false,
      ['sign']
    );
    var AesKey = await subtle.sign(
      {name: 'HMAC'},
      HMACKey,
      PreMasterKey
    );
    PreMasterKey = undefined;

    return sivCtr.Decrypt(AesKey, Nonce, Ciphertext, AdditionalData);
  }
};
