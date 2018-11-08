/* globals describe,it */
const assert = require('assert');
const keymanager = require('../web3c/key_manager');
const MraeBox = require('../crypto/node/mrae_box');

describe('Key Manager', function() {
  it('can encrypt and decrypt', async function() {
    let km1 = new keymanager(null, undefined, MraeBox);
    km1.getSecretKey();
    let km2 = new keymanager(null, undefined, MraeBox);
    km2.getSecretKey();

    let pubkey = km2.getPublicKey();

    let cyphertext = await km1.encrypt('0x1234abcdef', pubkey);

    let recover = await km2.decrypt(cyphertext);
    assert.equal('0x1234abcdef', recover);
  });

  let mock_web3 = {
    confidential: {
      getPublicKey: (addr, cb) => {
        cb(null, {
          public_key: 'stkey',
          timestamp: new Date()
        });
      }
    }
  };

  it('manages a sane state machine for key progression', async function() {
    let km = new keymanager(mock_web3, undefined, MraeBox);

    // contracts start unregistered.
    assert.equal(km.isRegistered('that'), false);

    // Attempts to get local keys should fail
    assert.throws(() => {
      km.isRegistered('me')
    });

    km.add('that', 'magic');
    assert.equal(km.isRegistered('that'), true);
  
    // re-adding the same value should be idempotent
    km.add('that', 'magic');

    assert.equal(km.isRegistered('that'), true);

    // Attempts to change longterm key should fail
    assert.throws(() => {
      km.add('that', 'other');
    });

    // Attempts to change local key should fail
    assert.throws(() => {
      km.add('me', 'other');
    });

    // Load shorterm key from web3
    let ret = null;
    km.get('that', (key) => {ret = key;});
    assert.equal(ret, 'stkey');

    // reloading should work
    ret = null;
    km.get('that', (key) => {ret = key;});
    assert.equal(ret, 'stkey');

    // trying to get local key should fail.
    ret = null;
    assert.throws(() => {
      km.get('me', (key) => {ret = key;});
    })
    assert.equal(ret, null);

    km.reset();
    assert.equal(km.isRegistered('that'), false);
  });
});
