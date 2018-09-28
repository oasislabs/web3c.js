const assert = require('assert');
const web3 = require('web3');
const web3c = require('../web3c');
const gateway = require('./mockgateway');

describe('Web3', function() {
  // TODO: skip / assume external web3 if in browser.
  let provider = gateway();
  let serverPort;

  before(function(done) {
    provider.listen(0, () => {
      serverPort = provider.address().port;
      done();
    });
  });
  after(() => {
    provider.close();
  });

  it('should retrieve contract keys', async function() {
    let provider = new web3.providers.HttpProvider("http://localhost:" + serverPort);
    let inst = new web3c(provider);

    let key = await inst.confidential.getPublicKey("0x62f5dffcb1C45133c670C7786cD94B75D69F09e1");
    assert.equal(0, key.key);
  });
});
