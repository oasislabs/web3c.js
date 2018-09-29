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
    assert.equal(64 + 2, key.key.length);
  });

  it('should support making encrypted calls', async function() {
    let provider = new web3.providers.HttpProvider("http://localhost:" + serverPort);
    let inst = new web3c(provider);

    let contract = inst.confidential.Contract([{
  		'constant': false,
  		'inputs': [],
  		'name': 'run',
  		'outputs': [{
        'name': '_status',
        'type': 'uint8'
      }],
  		'payable': false,
  		'stateMutability': 'view',
  		'type': 'function'
  	}], /* from address */ '0x62f5dffcb1C45133c670C7786cD94B75D69F09e1', {
      /* long-term pubkey expected for signature. arbitrarily chosen. */
      'key': '0x59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a'
    });
    let response = await contract.methods.run().call();
    assert.equal(10, response);
  });
});
