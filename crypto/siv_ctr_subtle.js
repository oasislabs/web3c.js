// Browser based Siv_Ctr implementation based on subtle crypto.
var subtle = require('subtle');

const TagSize = 16;

var Encrypt = async function (Key, Nonce, Plaintext, AdditionalData) {
  let MACKey = await subtle.importKey(
    'raw', new Uint8Array(Key).slice(0, 32), {
      name: 'HMAC',
      hash: {name: 'SHA-256'}
    },
    false,
    ['sign']
  );
  let EncKey = await subtle.importKey(
    'raw', new Uint8Array(Key).slice(32, 48), {
      name: 'AES-CTR'
    },
    false,
    ['encrypt']
  );
  // TODO: enforce big endian
  let AdditionalDataLength = new Uint32Array([AdditionalData.byteLength]);
  let PlaintextLength = new Uint32Array([Plaintext.byteLength]);
  let SivData = new Uint8Array([Nonce, AdditionalDataLength, PlaintextLength, AdditionalData, Plaintext]);
  let Siv = await subtle.sign(
    {name: 'HMAC'},
    MACKey,
    SivData
  );
  let Cyphertext = await subtle.encrypt(
    {
      name: 'AES-CTR',
      counter: Siv,
      length: 128
    },
    EncKey,
    Plaintext
  );
  return new Uint8Array([new Uint8Array(Cyphertext), new Uint8Array(Siv)]);
};

var Decrypt = async function (Key, Nonce, Ciphertext, AdditionalData) {
  let MACKey = await subtle.importKey(
    'raw', new Uint8Array(Key).slice(0, 32), {
      name: 'HMAC',
      hash: {name: 'SHA-256'}
    },
    false,
    ['sign']
  );
  let DecKey = await subtle.importKey(
    'raw', new Uint8Array(Key).slice(32, 48), {
      name: 'AES-CTR'
    },
    false,
    ['decrypt']
  );
  let CiphertextLength = Ciphertext.byteLength;
  let Tag = Ciphertext.slice(CiphertextLength - TagSize, CiphertextLength);

  let Plaintext = await subtle.decrypt(
    {
      name: 'AES-CTR',
      counter: Tag,
      length: 128
    },
    DecKey,
    Ciphertext.slice(0, CiphertextLength - TagSize)
  );

  let AdditionalDataLength = new Uint32Array([AdditionalData.byteLength]);
  let PlaintextLength = new Uint32Array([Plaintext.byteLength]);
  let SivData = new Uint8Array([Nonce, AdditionalDataLength, PlaintextLength, AdditionalData, Plaintext]);
  let Siv = await subtle.sign(
    {name: 'HMAC'},
    MACKey,
    SivData
  );

  if (!Tag.equals(Siv)) {
    throw new Error('Incorrect Signature');
  }

  return Plaintext;
};

module.exports = {
  TagSize: TagSize,
  Encrypt: Encrypt,
  Decrypt: Decrypt
};
