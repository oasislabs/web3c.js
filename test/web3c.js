/* globals describe,it,before,after */
const assert = require('assert');
const web3 = require('web3');
const EventEmitter = require('events');
const web3c = require('../');
const gateway = require('./mockgateway');
const artifact = require('../demo/example.json');
const HDWalletProvider = require('truffle-hdwallet-provider');
const utils = require('../web3c/utils');

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
    let firstContract = new (new web3c(gw)).oasis.Contract(artifact.abi, undefined, {saveSession: false});
    let secondContract = new (new web3c(gw)).oasis.Contract(artifact.abi, undefined, {saveSession: false});

    let firstKey = firstContract._requestManager.provider.keyManager.getPublicKey();
    let secondKey = secondContract._requestManager.provider.keyManager.getPublicKey();
    assert.notEqual(firstKey, secondKey);
  }).timeout(timeout);

  it('should error if a malformed signature is stored in the deploy logs', async () => {
    await assert.rejects(
      async function () {
        let _web3c = new web3c(gw);
        let counterContract = new _web3c.oasis.Contract(artifact.abi);
        await counterContract.deploy({
          data: artifact.bytecode
        }).send({
          from: gateway.responses.MALFORMED_SIGNATURE_FROM_ADDRESS,
          gasPrice: '0x3b9aca00'
        });
      }
    );
  });

  it('should error if a malformed signature is returned from oasis_getPublicKey', async () => {
    await assert.rejects(
      async function () {
        let _web3c = new web3c(gw);
        let contract = new _web3c.oasis.Contract(artifact.abi);
        contract = await contract.deploy({
          data: artifact.bytecode
        }).send({
          from: address,
          gasPrice: '0x3b9aca00'
        });
        await _web3c.oasis.getPublicKey(contract.options.address);
      }
    );
  });

  it('should retrieve contract keys from a previously deployed contract address', async function() {
    let _web3c = web3cMockSigner(gw);
    let counterContract = new _web3c.oasis.Contract(artifact.abi);
    try {
      let contract = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00'
      });
      let key = await _web3c.oasis.getPublicKey(contract.options.address);
      assert.equal(64 + 2, key.public_key.length);
    } catch (e) {
      assert.fail(e);
    }
  }).timeout(timeout);

  it('should deploy a confidential counter contract', async () => {
    let _web3c = web3cMockSigner(gw);
    let counterContract = new _web3c.oasis.Contract(artifact.abi);
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

    let counterContract = new _web3c.oasis.Contract(artifact.abi);
    const deployMethod = counterContract.deploy({data: artifact.bytecode});
    let estimatedGas = await deployMethod.estimateGas();
    assert.equal(estimatedGas, '0xe1bd');
  }).timeout(timeout);

  it('should execute transactions and calls', async () => {
    let _web3c = web3cMockSigner(gw);
    let counterContract = new _web3c.oasis.Contract(artifact.abi);
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
    let counterContract = new client.oasis.Contract(artifact.abi);
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
    let counterContract = new _web3c.oasis.Contract(artifact.abi, undefined, {
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
    let counterContract = new _web3c.oasis.Contract(artifact.abi, undefined, {
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

  // Deployed non-confidential contract for the following tests.
  let plaintextInstance;

  it('should deploy a non confidential contract in the oasis namespace', async () => {
    let _web3c = new web3c(gw);
    let counterContract = new _web3c.oasis.Contract(artifact.abi, undefined, {
      from: gateway.responses.OASIS_DEPLOY_HEADER_PLAINTEXT_ADDRESS
    });
    plaintextInstance = await counterContract.deploy({
      data: artifact.bytecode,
      header: {
        expiry: gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY,
        confidential: false
      }
    }).send({ gas: '0x10000' });

    assert.equal(
      plaintextInstance.options.address.toLowerCase(),
      gateway.responses.OASIS_DEPLOY_PLAINTEXT_TX_RECEIPT.contractAddress
    );
  }).timeout(timeout);

  it('should send a transaction to a non confidential contract in the oasis namespace', async () => {
    const receipt = await plaintextInstance.methods.incrementCounter().send({
      from: address,
      gasPrice: '0x3b9aca00',
      gas: '0x10000'
    });
    assert.equal(receipt.transactionHash, gateway.responses.OASIS_PLAINTEXT_TX_HASH);

  }).timeout(timeout);

  it('should subscribe to completedTransaction from anonymous contract', (done) => {
    let _web3c = new web3c(gw);
    let emitter = new EventEmitter();

    _web3c.oasis._oasisExclusiveSubscriptions.subscribe = function(type, filter) {
      assert.equal(type, 'completedTransaction');
      assert.equal(filter.transactionHash, 'hash');
      return emitter;
    };

    let result = _web3c.oasis.subscribe('completedTransaction', {
      transactionHash: 'hash'
    });

    result.on('data', data => {
      assert.equal(data.transactionHash, 'hash');
      assert.equal(data.returnData, '0x00010203');
      done();
    }).on('error', done);

    emitter.emit('data', {
      transactionHash: 'hash',
      returnData: [0, 1, 2, 3]
    });
  });

  it('should subscribe to completedTransaction from non-confidential contract', (done) => {
    let _web3c = new web3c(gw);
    let emitter = new EventEmitter();

    _web3c.oasis._oasisExclusiveSubscriptions.subscribe = function(type, filter) {
      assert.equal(type, 'completedTransaction');
      assert.equal(filter.transactionHash, 'hash');
      return emitter;
    };

    _web3c.oasis.isConfidential = () => new Promise(resolve => resolve(false));
    let result = _web3c.oasis.subscribe('completedTransaction', {
      transactionHash: 'hash',
      address,
    });

    result.on('data', data => {
      assert.equal(data.transactionHash, 'hash');
      assert.equal(data.returnData, '0x00010203');
      done();
    }).on('error', done);

    emitter.emit('data', {
      transactionHash: 'hash',
      returnData: [0, 1, 2, 3]
    });
  });

  it('should subscribe to completedTransaction from confidential contract', (done) => {
    let _web3c = new web3c(gw);
    let emitter = new EventEmitter();

    _web3c.oasis.keyManager.encrypt = (text) => new Promise((resolve) => resolve(text));
    _web3c.oasis.keyManager.decrypt = (text) => new Promise((resolve) => resolve(text));

    _web3c.oasis._oasisExclusiveSubscriptions.subscribe = function(type, filter) {
      assert.equal(type, 'completedTransaction');
      assert.equal(filter.transactionHash, 'hash');
      return emitter;
    };

    _web3c.oasis.isConfidential = () => new Promise(resolve => resolve(true));
    let result = _web3c.oasis.subscribe('completedTransaction', {
      transactionHash: 'hash',
      address,
    });

    emitter.emit('data', {
      transactionHash: 'hash',
      returnData: [0, 1, 2, 3]
    });

    result.on('data', data => {
      assert.equal(data.transactionHash, 'hash');
      assert.equal(data.returnData, '0x00010203');
      done();
    }).on('error', done);
  });

  async function deployContract(options = {}) {
    const confidential = !!options.confidential;
    const _web3c = web3cMockSigner(gw, undefined, options);
    const emitter = new EventEmitter();
    const fromAddress = confidential
      ? gateway.responses.OASIS_DEPLOY_HEADER_ADDRESS
      : gateway.responses.OASIS_DEPLOY_HEADER_PLAINTEXT_ADDRESS;
    const counterContract = new _web3c.oasis.Contract(artifact.abi, undefined, {
      from: fromAddress
    });

    const contract = await counterContract.deploy({
      data: artifact.bytecode,
      header: {
        expiry: gateway.responses.OASIS_DEPLOY_HEADER_EXPIRY,
        confidential: confidential
      }
    }).send({ gas: '0x10000' });

    _web3c.oasis._oasisExclusiveSubscriptions.subscribe = function(type, filter) {
      assert.equal(filter.fromAddress, fromAddress);
      return emitter;
    };

    _web3c.oasis.isConfidential = () => new Promise(resolve => resolve(confidential));

    if (confidential) {
      _web3c.oasis.keyManager.encrypt = (text) => new Promise((resolve) => resolve(text));
      _web3c.oasis.keyManager.decrypt = (text) => new Promise((resolve) => resolve(text));
    }

    return { contract: contract, emitter: emitter, web3c: _web3c };
  }

  it('should be able to call invoke for non confidential contract', async () => {
    const expectedTransactionHash =
          '0xaaaaaa5f3564e8b30262fb931988888bbb203692bba9763a45c61b25ce531000';
    const { contract, emitter } = await deployContract({ confidential: false });

    let eventCount = 0;
    const promise = contract.methods.getCounter().invoke({ gas: '0x10000' })
      .on('transactionHash', hash => {
        assert.equal(hash, expectedTransactionHash);
        eventCount++;
      })
      .on('error', err => assert.fail(err));

    emitter.emit('data', {
      transactionHash: expectedTransactionHash,
      returnData: [
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1]
    });

    const result = await promise;
    assert.equal(result, 1);
    assert.equal(eventCount, 1);
  });

  it('should call invoke and reject promise on subscription failure', async () => {
    const { contract, emitter } = await deployContract({ confidential: false });

    const promise = contract.methods.incrementCounter().invoke({ gas: '0x10000' })
      .on('transactionHash', () => {
        emitter.emit('error', new Error('subscription failed'));
      })
      .on('error', err => assert.fail(err));

    try {
      await promise;
      assert.fail(new Error('expected promise to throw error'));
    } catch (e) {
      assert.equal(e.message.includes('subscription failed'), true);
    }
  });

  it('should cleanup invoke subscription on timeout', async () => {
    const expectedTransactionHash =
          '0xaaaaaa5f3564e8b30262fb931988888bbb203692bba9763a45c61b25ce531000';
    const { contract, emitter, web3c } = await deployContract({
      confidential: false,
      inactiveSubscriptionTimeout: 500
    });

    emitter.on('transactionHash',
      hash => assert.equal(hash, expectedTransactionHash));

    try {
      await contract.methods.getCounter().invoke({ gas: '0x10000' });
      assert.fail(new Error('error timeout should have been raised'));
    } catch(e) {
      assert.equal(e.message, 'subscription timed out');
      console.log('subscriptions: ', web3c.oasis._invokeSubscription.subscriptions);
      assert.equal(utils.isEmptyObject(web3c.oasis._invokeSubscription.subscriptions), true);
    }
  });

});

/**
 * @returns a web3c client with a mocked signer for response signature validation.
 */
function web3cMockSigner(gw, web3, options) {
  let mockSigner = {
    verify: () => {  }
  };
  let _web3c = new web3c(gw, web3, options);

  _web3c.oasis.getPublicKey.method.outputFormatter = (t) => t;
  _web3c.oasis.keyManager.signer = mockSigner;

  return _web3c;
}

module.exports.web3cMockSigner = web3cMockSigner;
