/* globals describe,it,before,after */
const assert = require('assert');
const web3 = require('web3');
const web3c = require('../web3c');
const gateway = require('./mockgateway');
const artifact = require('../demo/example.json');
const HDWalletProvider = require('truffle-hdwallet-provider');

describe('Web3', () => {

  let gw;
  let address;
  const TIMEOUT = 5000;

  if (process && process.env && process.env.MNEMONIC) {
    gw = new HDWalletProvider(process.env.MNEMONIC, process.env.GATEWAY);
    address = Object.keys(gw.wallets)[0];
    // need to stop the provider from polling eth_getBlockNumber so that the
    // tests can end
    after(() => {
      gw.engine.stop();
    });
  } else if (process && process.env && process.env.GATEWAY) {
    gw = new web3.providers.HttpProvider(process.env.GATEWAY);
    // todo: get address from wallet.
  } else {
    let provider = gateway();
    // arbitrarily chosen.
    address = '0x62f5dffcb1C45133c670C7786cD94B75D69F09e1';

    before(function(done) {
      provider.listen(0, () => {
        gw = new web3.providers.HttpProvider('http://localhost:' + provider.address().port);
        done();
      });
    });
    after(() => {
      provider.close();
    });
  }

  it('should retrieve contract keys', async function() {
    let inst = new web3c(gw);
    let key = await inst.confidential.getPublicKey('0x62f5dffcb1C45133c670C7786cD94B75D69F09e1');
    assert.equal(64 + 2, key.key.length);
  }).timeout(TIMEOUT);

  it('should support transient contracts with separate key state', async () => {
    let firstContract = (new web3c(gw)).confidential.Contract(artifact.abi, undefined, {saveSession: false});
    let secondContract = (new web3c(gw)).confidential.Contract(artifact.abi, undefined, {saveSession: false});

    let firstKey = firstContract.currentProvider.keymanager.getPublicKey();
    let secondKey = secondContract.currentProvider.keymanager.getPublicKey();
    assert.notEqual(firstKey, secondKey);
  }).timeout(TIMEOUT);

  it('should deploy a confidential counter contract', async () => {
    let counterContract = (new web3c(gw)).confidential.Contract(artifact.abi);
    try {
      await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00',
        gasLimit: '0x100000'
      });
    } catch (e) {
      assert.fail(e);
    }
  }).timeout(TIMEOUT);

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
  }).timeout(TIMEOUT);

  it ('should get confidential getPastLogs logs', async() => {
    let client = new web3c(gw);
    let counterContract = client.confidential.Contract(artifact.abi);
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
      gasLimit: '0x100000',
    });

    let logs = await instance.getPastEvents();
    assert.equal(logs.length, 1);
    // since the client uses a different ephemeral key each time, it
    // won't always be able to decode the returned log.
  }).timeout(TIMEOUT);
});
