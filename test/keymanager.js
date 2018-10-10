const assert = require('assert');
const keymanager = require('../web3c/keymanager');

describe('Key Manager', function() {
  it('can encrypt and decrypt', async function() {
    let km1 = new keymanager();
    km1.getSecretKey();
    let km2 = new keymanager();
    km2.getSecretKey();

    let pubkey = km2.publicKey.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');

    let cyphertext = await km1.encrypt("this is a test", pubkey);
    let hexcypher = cyphertext.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');

    let recover = await km2.decrypt(hexcypher);
    assert.equal("this is a test", recover);
  });
});
