// This file provides the "web3.confidential" exported interface
const ConfidentialProvider = require('./confidential_provider');
const makeContractFactory = require('./contract_factory');
const DeployHeader = require('./deploy_header');
const KeyManager = require('./key_manager');
const Signer = require('./signer');

/**
 * Confidential
 * This module exports the `web3.confidential` namespace. It defines the
 * parameters of the raw underlying web3 methods added to the web3 protocol,
 * and exposes the confidential contract interface by creating a
 * web3.eth.Contract communication through a ConfidentialProvider.
 */
class Confidential {
  constructor (web3, storage, mraebox) {
    this.keyManager = new KeyManager(web3, storage, mraebox);
    this._setupConfidentialRpc(web3);
    this._setupConfidentialContract(web3, storage, mraebox);
    this._setupWrappedAccounts(web3);
  }

  /**
   * Creates methods on the confidential namespace that make requests to the confidential_*
   * web3c rpc endpoints. For example, one may do `web3c.confidential.getPublicKey(address)`.
   *
   * @param {Object} web3 is a web3 object.
   */
  _setupConfidentialRpc(web3) {
    let methods = [
      // Second parameter - the long-term key - is intercepted by the provider.
      new web3.extend.Method({
        name: 'getPublicKey',
        call: 'confidential_getPublicKey',
        params: 1,
        inputFormatter: [web3.extend.formatters.inputAddressFormatter],
        outputFormatter: getPublicKeyOutputFormatter
      }),
      new web3.extend.Method({
        name: 'call',
        call: 'confidential_call_enc',
        params: 2,
        inputFormatter: [
          web3.extend.formatters.inputCallFormatter,
          web3.extend.formatters.inputDefaultBlockNumberFormatter
        ],
        outputFormatter: callOutputFormatter
      }),
    ];

    methods.forEach((method) => {
      method.setRequestManager(web3._requestManager);
      method.attachToObject(this);
    });
  }

  /**
   * Creates the confidential `Contract` constructor on the `confidential` namespace.
   * The `Contract` behaves in the same way as the eth `Contract` object, except
   * transparently encrypts/decrypts all outbound/inbound requests according
   * to the web3c spec.
   */
  _setupConfidentialContract(web3, storage, mraebox) {
    // Save `this` so that we can refer to it and its properties inside `ConfidentialContract`.
    // Otherwise `this` is overridden when `new` is used in `new Contract`.
    let self = this;

    this.Contract = makeContractFactory(web3, (options) => {
      let provider = new ConfidentialProvider(this.keyManager, web3._requestManager);

      let keymanager = self.keyManager;

      if (options && options.saveSession === false) {
        keymanager = new KeyManager(web3, undefined, mraebox);
        provider = new ConfidentialProvider(keymanager, web3._requestManager);
      }

      if (options && options.key) {
        keymanager.add(address, options.key);
      }

      return provider;
    });

  }

  _setupWrappedAccounts(web3) {
    let accounts = web3.eth.accounts;
    const transformer = new ConfidentialProvider.private.ConfidentialSendTransform(web3._requestManager.provider, this.keyManager);

    let wrappedSigner = accounts.signTransaction.bind(accounts);

    accounts.signTransaction = function signConfidentialTransaction (tx, from) {
      if (tx.to) {
        return new Promise(function (resolve, reject) {
          transformer.encryptTx(tx, function finishSignConfidentialTransaction(err) {
            if (err) {
              reject(err);
            }
            try {
              return wrappedSigner(tx, from).then(resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
      transformer.addOasisDeployHeader(tx);
      return wrappedSigner(tx, from);
    };

    this.accounts = accounts;
  }

  resetKeymanager() {
    this.keyManager.reset();
  }
}

function getPublicKeyOutputFormatter (t) {
  let signer = new Signer(KeyManager.publicKey());
  let err = signer.verify(t.signature, t.public_key, t.timestamp);
  if (err) {
    throw err;
  }
  return t;
}

function callOutputFormatter (t) {
  return t;
}

module.exports = Confidential;
