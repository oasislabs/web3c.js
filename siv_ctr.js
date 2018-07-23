const TagSize = 16;

module.exports = {
  Encrypt: async function(Key, Nonce, Plaintext, AdditionalData) {
    let MAC_Key = await window.crypto.subtle.importKey(
        "raw", new Uint8Array(Key).slice(0, 32), {
            name: "HMAC",
            hash: {name: "SHA-256"}
        },
        false,
        ["sign"]
    );
    let Enc_Key = await window.crypto.subtle.importKey(
      "raw", new Uint8Array(Key).slice(32, 16), {
        name: "AES-CTR"
      },
      false,
      ["encrypt"]
    );
    let AdditionalDataLength = new Uint32Array([AdditionalData.byteLength]);
    let PlaintextLength = new Uint32Array([Plaintext.byteLength]);
    let SivData = new Uint8Array([Nonce, AdditionalDataLength, PlaintextLength, AdditionalData, Plaintext]);
    let Siv = await window.crypto.subtle.sign(
      {name: "HMAC"},
      MAC_Key,
      SivData
    );
    let Cyphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-CTR",
        counter: Signature,
        length: 128
      },
      Enc_Key,
      Plaintext
    );
    return new Uint8Array([new Uint8Array(Cyphertext), new Uint8Array(Siv)]);
  },
  Decrypt: function(Key, Nonce, Cyphertext, AdditionalData) {
    // TODO
    return undefined;
  }
};

/*
 + TODO: decryption.
 +SIV_CTR-AES128_HMAC-SHA256-128_Decrypt(K, NONCE, T, C, AAD) -> P:
 +  MAC_KEY = K[0:32]
 +  DEC_KEY = K[32:48]
 +
 +  P = CTR-AES128(
 +  	DEC_KEY, // Key
 +  	T,       // Initialization Vector (SIV/Tag produced by encryption)
 +  	C,       // Ciphertext
 +  )
 +
 +  SIV_CMP = HMAC-SHA256-128(
 +    MAC_KEY,                                             // Key
 +    NONCE | uint64(len(AAD)) | uint64(len(P)) | AAD | P, // Message
 +  )
 +
 +  if T != SIV_CMP:
 +  	BZERO(P)
 +    return FAIL
 +
 +  return P
 */
