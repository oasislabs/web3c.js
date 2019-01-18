/* globals describe,it,before,after */
const assert = require('assert');
const web3 = require('web3');
const web3c = require('../');
const gateway = require('./mockgateway');
const artifact = require('../demo/example.json');
const HDWalletProvider = require('truffle-hdwallet-provider');

describe('Web3', () => {

  let gw;
  let address;
  let timeout;

  if (process && process.env && process.env.TIMEOUT) {
    timeout = process.env.TIMEOUT;
  } else {
    timeout = 5000;
  }

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

  it('should support transient contracts with separate key state', async () => {
    let firstContract = new (new web3c(gw)).confidential.Contract(artifact.abi, undefined, {saveSession: false});
    let secondContract = new (new web3c(gw)).confidential.Contract(artifact.abi, undefined, {saveSession: false});

    let firstKey = firstContract._requestManager.provider.keymanager.getPublicKey();
    let secondKey = secondContract._requestManager.provider.keymanager.getPublicKey();
    assert.notEqual(firstKey, secondKey);
  }).timeout(timeout);

  it('should retrieve contract keys from a previously deployed contract address', async function() {
    let _web3c = new web3c(gw);
    let counterContract = new _web3c.confidential.Contract(artifact.abi);
    try {
      let contract = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00'
      });
      let key = await _web3c.confidential.getPublicKey(contract.options.address);
      assert.equal(64 + 2, key.public_key.length);
    } catch (e) {
      assert.fail(e);
    }
  }).timeout(timeout);


  it('should not retrieve contract keys from a non deployed contract address', async function() {
    await assert.rejects(
      async function () {
        await new web3c(gw)
          .confidential
          .getPublicKey('0x0000000000000000000000000000000000000000')
      }
    );
  }).timeout(timeout);

  it('should deploy a confidential counter contract', async () => {
    let counterContract = new (new web3c(gw)).confidential.Contract(artifact.abi);
    try {
      await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00'
      });
    } catch (e) {
      assert.fail(e);
    }
  }).timeout(timeout);

  it('should execute transactions and calls', async () => {
    let counterContract = new (new web3c(gw)).confidential.Contract(artifact.abi);
    let instance;
    try {
      instance = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00'
      });
    } catch (e) {
      assert.fail(e);
    }

    await instance.methods.incrementCounter().send({
      from: address,
      gasPrice: '0x3b9aca00'
    });
    const count = await instance.methods.getCounter().call();
    assert.equal(count, 1);
  }).timeout(timeout);

  it('should get confidential getPastLogs logs', async () => {
    let client = new web3c(gw);
    let counterContract = new client.confidential.Contract(artifact.abi);
    let instance;
    try {
      instance = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00'
      });
    } catch (e) {
      assert.fail(e);
    }
    const receipt = await instance.methods.incrementCounter().send({
      from: address,
      gasPrice: '0x3b9aca00'
    });
    const logs = await instance.getPastEvents('allEvents', {
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });
    assert.equal(logs.length, 1);
    // since the client uses a different ephemeral key each time, it
    // won't always be able to decode the returned log.
  }).timeout(timeout);

  it('should estimate gas for confidential transactions the same as gas actually used', async () => {
    const _web3c = (new web3c(gw));

    let counterContract = new _web3c.confidential.Contract(artifact.abi);
    const deployMethod = counterContract.deploy({data: artifact.bytecode});
    let estimatedGas = await deployMethod.estimateGas();
    counterContract = await deployMethod.send({
      from: address,
      gasPrice: '0x3b9aca00',
      gas: estimatedGas
    });
    const txHash = counterContract._requestManager.provider.outstanding[0];
    const receipt = await _web3c.eth.getTransactionReceipt(txHash);

    assert.equal(estimatedGas, receipt.gasUsed);
    assert.equal(estimatedGas, receipt.cumulativeGasUsed);
  }).timeout(timeout);

  it('should yield a larger estimate for confidential transactions than non-confidential', async () => {
    const _web3c = (new web3c(gw));

    const confidentialContract = new _web3c.confidential.Contract(artifact.abi);
    const confidentialDeploy = confidentialContract.deploy({data: artifact.bytecode});
    const confidentialEstimatedGas = await confidentialDeploy.estimateGas();

    const contract = new _web3c.eth.Contract(artifact.abi);
    const deploy = contract.deploy({data: artifact.bytecode});
    const estimatedGas = await deploy.estimateGas();

    assert.equal(confidentialEstimatedGas-estimatedGas > 0, true);
  }).timeout(timeout);
});
