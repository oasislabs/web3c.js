var nacl = require('tweetnacl');
var siv_ctr = require('./siv_ctr');

let boxKDFTweak;
if (typeof TextEncoder !== "undefined") {
  // Browser
  boxKDFTweak = new TextEncoder("utf-8").encode("MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128");
} else {
  // Node
  let str = "MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128";
  boxKDFTweak = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    boxKDFTweak[i] = str.charCodeAt(i);
  }
}

module.exports = {
  Seal: async function(PK_Peer_Static, Nonce, Plaintext, AdditionalData) {
    let EphemeralKey = nacl.box.keyPair();
    let PreMasterKey = nacl.scalarMult(EphemeralKey.secretKey, PK_Peer_Static);
    delete EphemeralKey.secretKey;

    let HMAC_Key = await window.crypto.subtle.importKey(
        "raw", boxKDFTweak, {
            name: "HMAC",
            hash: {name: "SHA-384"}
        },
        false,
        ["sign"]
    );
    let AesKey = await window.crypto.subtle.sign(
      {name: "HMAC"},
      HMAC_Key,
      PreMasterKey
    );
    delete PreMasterKey;

    let Cyphertext = await siv_ctr.Encrypt(AesKey, Nonce, Plaintext, AdditionalData);
    return {
      PublicKey: EphemeralKey.publicKey,
      Cyphertext: Cyphertext
    };
  },

  Open: async function(SK_Static, PK_Peer_Ephemeral, Nonce, Tag, Cyphertext, AdditionalData) {
    // TODO
    return undefined;
  }
};

/*
MRAE_Box_Seal(PK_Peer_Static, NONCE, P, AAD) -> PK, C, T:
 +  # Create an ephemeral keypair, and derive a shared secret.
 +  PK, SK = KEYGEN()
 +  PRE_MASTER_KEY = ECDH(SK, PK_Peer_Static)
 +  BZERO(SK)
 +
 +  K = HMAC-SHA-384(
 +  	"MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128", // Key
 +  	PRE_MASTER_KEY,                            // Message
 +  )
 +  BZERO(PRE_MASTER_KEY)
 +
 +  C, T = SIV_CTR-AES128_HMAC-SHA256-128_Encrypt(
 +  	K,
 +  	NONCE,
 +  	P,
 +  	AAD,
 +  )
 +
 +  return PK, C, T
 +```
 +
 +Decryption is performed as follows:
 +
 +```
 +MRAE_Box_Open(SK_Static, PK_Peer_Ephemeral, NONCE, T, C, AAD) -> P:
 +  # Derive the shared secret.
 +  PRE_MASTER_KEY = ECDH(SK_Static, PK_Peer_Ephemeral)
 +
 +  K = HMAC-SHA-384(
 +  	"MRAE_Box_SIV_CTR-AES128_HMAC-SHA256-128", // Key
 +  	PRE_MASTER_KEY,                            // Message
 +  )
 +
 +  return SIV_CTR-AES128_HMAC-SHA256-128_Decrypt(
 +  	K,
 +  	NONCE,
 +  	T,
 +  	C,
 +  	AAD,
 +  )
 */
