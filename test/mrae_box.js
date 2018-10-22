/* globals describe,it */
const assert = require('assert');
const nacl = require('tweetnacl');
const mraeBox = require('../crypto/node/mrae_box');

const nonceLen = 16;
const aadLen = 23;
const msgLen = 96;

describe('MraeBox', function() {
  var nonce = new Uint8Array(nonceLen);
  var aad = new Uint8Array(aadLen);
  var msg = new Uint8Array(msgLen);

  var i = 0;
  for (; i < nonceLen; i++) {
    nonce[i] = i;
  }
  for (; i < nonceLen + aadLen; i++) {
    aad[i - nonceLen] = i;
  }
  for (; i < nonceLen + aadLen + msgLen; i++) {
    msg[ i - nonceLen - aadLen] = i;
  }

  it('Can Encrypt & Decrypt', async function() {
    let alice = nacl.box.keyPair();
    let bob = nacl.box.keyPair();

    let ciphertext = await mraeBox.Seal(nonce, msg, aad, alice.publicKey, bob.secretKey);
    let recovered = await mraeBox.Open(nonce, ciphertext, aad, bob.publicKey, alice.secretKey);

    assert.deepEqual(msg, recovered, 'roundtrip of seal/open failed.');
  });
});
