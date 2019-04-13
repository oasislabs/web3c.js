const nacl = require('tweetnacl');
const sha512_256 = require('js-sha512').sha512_256;
const deoxys = require('deoxysii');

const boxKDFTweak_str = 'MRAE_Box_Deoxys-II-256-128';
var boxKDFTweak = Buffer.alloc(boxKDFTweak_str.length);
for (var i = 0; i < boxKDFTweak_str.length; i++) {
  boxKDFTweak[i] = boxKDFTweak_str.charCodeAt(i);
}

// ECDHAndTweak applies the X25519 scalar multiply with the given public and
// private keys, and applies a HMAC based tweak to the resulting output.
function ECDHAndTweak(PublicKey, PrivateKey) {
    let PreMasterKey = nacl.scalarMult(PrivateKey, PublicKey);

    let hash = sha512_256.hmac.create(boxKDFTweak);
    hash.update(PreMasterKey);
    return new Uint8Array(hash.arrayBuffer());
}

module.exports = {
  Seal: async function(Nonce, Plaintext, AdditionalData, PeerPublicKey, PrivateKey) {
    let AesKey = ECDHAndTweak(PeerPublicKey, PrivateKey);

    let AEAD = new deoxys.AEAD(AesKey);
    return AEAD.encrypt(Nonce, Plaintext, AdditionalData);
  },

  Open: async function(Nonce, Ciphertext, AdditionalData, PeerPublicKey, PrivateKey) {
    let AesKey = ECDHAndTweak(PeerPublicKey, PrivateKey);

    let AEAD = new deoxys.AEAD(AesKey);
    return AEAD.decrypt(Nonce, Ciphertext, AdditionalData);
  }
};
