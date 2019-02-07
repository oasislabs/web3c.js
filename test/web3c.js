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
    let provider = gateway.start();
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

  it('should error if a malformed signature is stored in the deploy logs', async () => {
    await assert.rejects(
      async function () {
        let _web3c = new web3c(gw);
        let counterContract = new _web3c.confidential.Contract(artifact.abi);
        await counterContract.deploy({
          data: artifact.bytecode
        }).send({
          from: gateway.responses.MALFORMED_SIGNATURE_FROM_ADDRESS,
          gasPrice: '0x3b9aca00'
        });
      }
    );
  });

  it('should error if a malformed signature is returned from confidential_getPublicKey', async () => {
    await assert.rejects(
      async function () {
        let _web3c = new web3c(gw);
        let contract = new _web3c.confidential.Contract(artifact.abi);
        contract = await contract.deploy({
          data: artifact.bytecode
        }).send({
          from: address,
          gasPrice: '0x3b9aca00'
        });
        await _web3c.confidential.getPublicKey(contract.options.address);
      }
    );
  });

  it('should retrieve contract keys from a previously deployed contract address', async function() {
    let _web3c = web3cMockSigner(gw);
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

  it('should deploy a confidential counter contract', async () => {
    let _web3c = web3cMockSigner(gw);
    let counterContract = new _web3c.confidential.Contract(artifact.abi);
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

  it('should estimate gas for confidential transactions', async () => {
    const _web3c = (new web3c(gw));

    let counterContract = new _web3c.confidential.Contract(artifact.abi);
    const deployMethod = counterContract.deploy({data: artifact.bytecode});
    let estimatedGas = await deployMethod.estimateGas();
    assert.equal(estimatedGas, '0xe1bd');
  }).timeout(timeout);

  it('should execute transactions and calls', async () => {
    let _web3c = web3cMockSigner(gw);
    let counterContract = new _web3c.confidential.Contract(artifact.abi);
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
    let client = web3cMockSigner(gw);
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

  it('should specify an Oasis contract deployment header when sending a deploy transaction', async () => {
    let _web3c = new web3c(gw);
    let counterContract = new _web3c.confidential.Contract(artifact.abi, undefined, {
      from: gateway.responses.OASIS_DEPLOY_HEADER_ADDRESS
    });
    let instance = await counterContract.deploy({
      data: artifact.bytecode,
      header: {
        expiry: gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY,
        confidential: true
      }
    }).send();

    let expiry = await instance.expiry();
    assert.equal(expiry, gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY);
    // Bonus: Sanity check other api.
    expiry = await _web3c.oasis.expiry(instance.options.address);
    assert.equal(expiry, gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY);
  }).timeout(timeout);

  it('should specify an Oasis contract deployment header when estimating gas for a deploy transaction', async () => {
    let _web3c = new web3c(gw);
    let counterContract = new _web3c.confidential.Contract(artifact.abi, undefined, {
      from: gateway.responses.OASIS_DEPLOY_HEADER_ADDRESS
    });

    let estimate = await counterContract.deploy({
      data: artifact.bytecode,
      header: {
        expiry: gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY,
        confidential: true
      }
    }).estimateGas();

    assert.equal(estimate, gateway.responses.OASIS_DEPLOY_HEADER_GAS);
  }).timeout(timeout);

  it('should error when trying to specify non confidential in the confidential namespace', async () => {
    assert.rejects(
      async function () {
        let _web3c = new web3c(gw);
        let counterContract = new _web3c.confidential.Contract(artifact.abi, undefined, {
          from: gateway.responses.OASIS_DEPLOY_HEADER_ADDRESS
        });
        let instance = await counterContract.deploy({
          data: artifact.bytecode,
          header: {
            expiry: gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY,
            // This should cause an error.
            confidential: false
          }
        }).send();
      }
    );
  }).timeout(timeout);
});

/**
 * @returns a web3c client with a mocked signer for response signature validation.
 */
function web3cMockSigner(gw) {
  let mockSigner = {
    verify: (_sign, _key, _timestamp) => {  }
  };
  let _web3c = new web3c(gw);

  _web3c.confidential.getPublicKey.method.outputFormatter = (t) => t;
  _web3c.confidential.keyManager.signer = mockSigner;

  return _web3c;
}

module.exports.web3cMockSigner = web3cMockSigner;
