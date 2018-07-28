/* globals Promise */
// Siv_Ctr encryption implemented with Node's crypto library and Buffers.
var crypto = require('crypto');

const TagSize = 16;

var Encrypt = async function (Key, Nonce, Plaintext, AdditionalData) {
  var hmac = crypto.createHmac('sha256', new Uint8Array(Key).slice(0, 32));

  // The IV is the hmac of SivData.
  let AdditionalDataLength = new Buffer(4);
  AdditionalDataLength.writeUInt32BE(AdditionalData.byteLength, 0);
  let PlaintextLength = new Buffer(4);
  PlaintextLength.writeUInt32BE(Plaintext.byteLength, 0);
  let SivData = Buffer.concat([Nonce, AdditionalDataLength, PlaintextLength, AdditionalData, Plaintext].map((i) => new Uint8Array(i)));
  hmac.update(SivData);
  let Siv = hmac.digest().slice(0, TagSize);

  let cipher = crypto.createCipheriv('AES-128-CTR', new Uint8Array(Key).slice(32, 48), Siv);

  // Node Async for crypto.cipher is evented, requiring an explicit promise.
  return new Promise(function(resolve, reject) {
    var output = new Buffer([]);
    cipher.on('readable', () => {
      var data = cipher.read();
      if (data) {
        output = Buffer.concat([output, data]);
      }
    });
    cipher.on('end', () => {
      var out = Buffer.concat([output, Siv]);
      resolve(out);
    });
    cipher.on('error', (e) => {
      reject(e);
    });
    cipher.write(Plaintext);
    cipher.end();
  });
};

var Decrypt = async function (Key, Nonce, Ciphertext, AdditionalData) {
  var crypto = require('crypto');
  let CiphertextLength = Ciphertext.byteLength;
  let cipher = crypto.createCipheriv(
    'AES-128-CTR',
    new Uint8Array(Key).slice(32, 48),
    new Uint8Array(Ciphertext).slice(CiphertextLength - TagSize, CiphertextLength)
  );
  let Plaintext = await new Promise(function (resolve, reject) {
    var output = new Buffer([]);
    cipher.on('readable', () => {
      var data = cipher.read();
      if (data) {
        output = Buffer.concat([output, data]);
      }
    });
    cipher.on('end', () => {
      resolve(output);
    });
    cipher.on('error', (e) => {
      reject(e);
    });
    cipher.write(Ciphertext.slice(0, CiphertextLength - TagSize))
    cipher.end();
  });


  // Validate HMAC
  var hmac = crypto.createHmac('sha256', new Uint8Array(Key).slice(0, 32));
  let AdditionalDataLength = new Buffer(4);
  AdditionalDataLength.writeUInt32BE(AdditionalData.byteLength, 0);
  let PlaintextLength = new Buffer(4);
  PlaintextLength.writeUInt32BE(Plaintext.byteLength, 0);
  let SivData = Buffer.concat([Nonce, AdditionalDataLength, PlaintextLength, AdditionalData, Plaintext].map((i) => new Uint8Array(i)));
  hmac.update(SivData);
  let Siv = hmac.digest().slice(0, TagSize);
  if (!Siv.equals(Ciphertext.slice(CiphertextLength - TagSize, CiphertextLength))) {
    throw new Error('Incorrect Signature');
  }

  return Plaintext;
};

module.exports = {
  TagSize: TagSize,
  Encrypt: Encrypt,
  Decrypt: Decrypt
};
