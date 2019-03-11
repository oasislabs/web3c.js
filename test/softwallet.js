/* globals describe,it,before,after */
const web3 = require('web3');
const gateway = require('./mockgateway');
const artifact = require('../demo/example.json');
const web3cmocksigner = require('./web3c').web3cMockSigner;

describe('Web3', () => {

  let gw;

  let provider = gateway.start();

  before(function(done) {
    provider.listen(0, () => {
      gw = new web3.providers.HttpProvider('http://localhost:' + provider.address().port);
      done();
    });
  });
  after(() => {
    provider.close();
  });

  it('should deploy and transact with a soft wallet', async () => {
    let _web3c = web3cmocksigner(gw);
    let acct = _web3c.eth.accounts.create();
    _web3c.oasis.defaultAccount = acct.address;
    _web3c.oasis.accounts.wallet.add(acct);

    let contract = new _web3c.oasis.Contract(artifact.abi);
    contract = await contract.deploy({
      data: artifact.bytecode
    }).send({
      from: acct.address,
      gas: '0x3b9aca00',
      gasPrice: '0x3b9aca00'
    });
    if (!contract) {
      throw new Error('contract should not be empty');
    }
    let mthd = contract.methods.incrementCounter();
    await mthd.send({
      gas: '0x3b9aca00',
      gasPrice: '0x3b9aca00',
      from: acct.address,
    });
  });
});
