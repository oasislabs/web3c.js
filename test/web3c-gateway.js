const assert = require('assert');
const web3 = require('web3');
const web3c = require('../web3c');
const gateway = require('./mockgateway');
const HDWalletProvider = require('truffle-hdwallet-provider');
const utils = require('./utils');

/**
 * Tests against an actual gateway instead of a mock.
 */
describe('Web3c-Gateway', () => {

  if (process.env.GATEWAY === '1') {

    const mnemonic = 'patient oppose cotton portion chair gentle jelly dice supply salmon blast priority';
    const provider = new HDWalletProvider(mnemonic, 'http://localhost:8545');
    const address = Object.keys(provider.wallets)[0];
    const artifact = utils.read_artifact('Counter');
    const counterContract = (new web3c(provider)).confidential.Contract(artifact.abi);
    /**
     * On chain contract that these tests will use and update.
     */
    let counterInstance = null;

    it('should retrieve contract keys', async () => {
      let inst = new web3c(provider);
      let key = await inst.confidential.getPublicKey('0x62f5dffcb1C45133c670C7786cD94B75D69F09e1');
      assert.equal(64 + 2, key.key.length);
    });

    it('should deploy a confidential counter contract', async () => {
      counterInstance = await counterContract.deploy({
        data: artifact.bytecode
      }).send({
        from: address,
        gasPrice: '0x3b9aca00',
        gasLimit: '0x100000'
      });
      // hack since the returned contract above doesn't use our shim (fix me)
      counterInstance = (new web3c(provider)).confidential.Contract(artifact.abi, counterInstance._address);
    });

    it('should execute a confidential_call_enc to get the current counter', async () => {
      const sighash = counterInstance.methods.getCounter().encodeABI();
      const count = await counterInstance.methods.getCounter().call();
      assert.equal(count, 0);
    });

    it('should execute a confidential eth_sendRawTransaction to increment the current counter', async () => {
      await counterInstance.methods.incrementCounter().send({
        from: address,
        gasPrice: '0x3b9aca00',
        gasLimit: '0x100000'
      });
      const count = await counterInstance.methods.getCounter().call();
      assert.equal(count, 1);
    });
  }
})
