/* globals describe,it */
const assert = require('assert');
const sivCtr = require('../crypto/node/siv_ctr');

const keyLen = 48;
const nonceLen = 16;
const aadLen = 13;
const msgLen = 64;

describe('SivCtr', function() {
  var key = new Uint8Array(keyLen);
  var nonce = new Uint8Array(nonceLen);
  var aad = new Uint8Array(aadLen);
  var msg = new Uint8Array(msgLen);

  var i = 0;
  for (; i < keyLen; i++) {
    key[i] = i;
  }
  for (; i < keyLen + nonceLen; i++) {
    nonce[i - keyLen] = i;
  }
  for (; i < keyLen + nonceLen + aadLen; i++) {
    aad[ i - keyLen - nonceLen] = i;
  }
  for (; i < keyLen + nonceLen + aadLen + msgLen; i++) {
    msg[i - keyLen + nonceLen + aadLen] = i;
  }

  it('should seal data', async function() {
    var ciphertext = await sivCtr.Encrypt(key, nonce, msg, aad);
    assert.equal(ciphertext.byteLength, msg.byteLength + sivCtr.TagSize);
  });

  it('should open data', async function() {
    var ciphertext = await sivCtr.Encrypt(key, nonce, msg, aad);
    var recovered = await sivCtr.Decrypt(key, nonce, ciphertext, aad);
    assert.deepEqual(msg, recovered, 'Failed to open encrypted data');
  });

  it('should work on test vectors', async function() {
    const testVectors = require('./SIV_CTR-AES128_HMAC-SHA256-128.json');
    let Key = new Buffer(testVectors.Key, 'base64');
    let Nonce = new Buffer(testVectors.Nonce, 'base64');
    let Aad = new Buffer(testVectors.AADData, 'base64');
    let Msg = new Buffer(testVectors.MsgData, 'base64');
    await Promise.all(testVectors.KnownAnswers.map(async function (answer) {
      let length = answer.Length;
      var ciphertext = await sivCtr.Encrypt(
        Key,
        Nonce,
        Msg.slice(0, length),
        Aad.slice(0, length)
      );
      ciphertext = new Buffer(ciphertext);
      let answerC = new Buffer(answer.Ciphertext, 'base64');
      let answerT = new Buffer(answer.Tag, 'base64');
      assert.equal(ciphertext.length, length + sivCtr.TagSize);
      assert.deepEqual(ciphertext.slice(0, answerC.length), answerC, 'test vector of length ' + length);
      assert.deepEqual(ciphertext.slice(answerC.length, ciphertext.length), answerT, 'Test vector tag of length' + length)
    }));
  });
});
