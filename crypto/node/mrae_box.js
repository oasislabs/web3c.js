const nacl = require('tweetnacl');
const crypto = require('crypto');
const sivCtr = require('./siv_ctr');

const boxKDFTweak_str = 'MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128';
var boxKDFTweak = new Uint8Array(boxKDFTweak_str.length);
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

    return sivCtr.Encrypt(AesKey, Nonce, Plaintext, AdditionalData);
  },

  Open: async function(Nonce, Ciphertext, AdditionalData, PeerPublicKey, PrivateKey) {
    var PreMasterKey = nacl.scalarMult(PrivateKey, PeerPublicKey);

    let hmac = crypto.createHmac('sha384', boxKDFTweak);
    hmac.update(PreMasterKey);
    let AesKey = hmac.digest();
    PreMasterKey = undefined;

    return sivCtr.Decrypt(AesKey, Nonce, Ciphertext, AdditionalData);
  }
};
