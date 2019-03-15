const nacl = require('tweetnacl');
const crypto = require('crypto');
const sivCtr = require('./siv_ctr');

const boxKDFTweak_str = 'MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128';
var boxKDFTweak = Buffer.alloc(boxKDFTweak_str.length);
for (var i = 0; i < boxKDFTweak_str.length; i++) {
  boxKDFTweak[i] = boxKDFTweak_str.charCodeAt(i);
}

module.exports = {
  Seal: async function(Nonce, Plaintext, AdditionalData, PeerPublicKey, PrivateKey) {
    var PreMasterKey = nacl.scalarMult(PrivateKey, PeerPublicKey);

    let hmac = crypto.createHmac('sha384', boxKDFTweak);
    hmac.update(PreMasterKey);
    let AesKey = hmac.digest();
    PreMasterKey = undefined;

    AesKey = Buffer.from(AesKey);
    Nonce = Buffer.from(Nonce);
    Plaintext = Buffer.from(Plaintext);
    AdditionalData = Buffer.from(AdditionalData);

    let cipher = await sivCtr.Encrypt(AesKey, Nonce, Plaintext, AdditionalData);

    return new Uint8Array(cipher);
  },

  Open: async function(Nonce, Ciphertext, AdditionalData, PeerPublicKey, PrivateKey) {
    var PreMasterKey = nacl.scalarMult(PrivateKey, PeerPublicKey);

    let hmac = crypto.createHmac('sha384', boxKDFTweak);
    hmac.update(PreMasterKey);
    let AesKey = hmac.digest();
    PreMasterKey = undefined;

    AesKey = Buffer.from(AesKey);
    Nonce = Buffer.from(Nonce);
    Ciphertext = Buffer.from(Ciphertext);
    AdditionalData = Buffer.from(AdditionalData);

    let plaintext = await sivCtr.Decrypt(AesKey, Nonce, Ciphertext, AdditionalData);

    return new Uint8Array(plaintext);
  }
};
