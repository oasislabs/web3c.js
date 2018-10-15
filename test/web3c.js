const assert = require('assert');
const web3 = require('web3');
const web3c = require('../web3c');
const gateway = require('./mockgateway');
const artifact = require('../demo/example.json');

describe('Web3', function() {

  let gw;
  let address;
  if (process && process.env && process.env.MNEMONIC) {
    gw = new HDWalletProvider(process.env.MNEMONIC, process.env.GATEWAY);
    address = Object.keys(gw.wallets)[0];
  } else if (process && process.env && process.env.GATEWAY) {
    gw = new web3.providers.HttpProvider(process.env.GATEWAY);
    // todo: get address from wallet.
  } else {
    let provider = gateway();
    // arbitrarily chosen.
    address = "0x62f5dffcb1C45133c670C7786cD94B75D69F09e1";

    before(function(done) {
      provider.listen(0, () => {
        gw = new web3.providers.HttpProvider("http://localhost:" + provider.address().port);
        done();
      });
    });
    after(() => {
      provider.close();
    });
  }

  it('should retrieve contract keys', async function() {
    let inst = new web3c(gw);

    let key = await inst.confidential.getPublicKey("0x62f5dffcb1C45133c670C7786cD94B75D69F09e1");
    assert.equal(64 + 2, key.key.length);
  });

  it('should deploy a confidential counter contract', async () => {
    let counterContract = (new web3c(gw)).confidential.Contract(artifact.abi);
    try {
      let counterInstance = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00',
        gasLimit: '0x100000'
      });
    } catch (e) {
      assert.fail(e);
    }
  });

  it('should execute transactions and calls', async () => {
    let counterContract = (new web3c(gw)).confidential.Contract(artifact.abi);
    let instance;
    try {
      instance = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00',
        gasLimit: '0x100000'
      });
    } catch (e) {
      assert.fail(e);
    }

    await instance.methods.incrementCounter().send({
      from: address,
      gasPrice: '0x3b9aca00',
      gasLimit: '0x100000'
    });
    const count = await instance.methods.getCounter().call();
    assert.equal(count, 1);
  });
});
