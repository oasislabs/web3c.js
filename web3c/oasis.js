const DeployHeader = require('./deploy_header');
const KeyManager = require('./key_manager');
const Signer = require('./signer');
const OasisProvider = require('./oasis_provider');
const ProviderConfidentialBackend = require('./provider_confidential_backend');
const makeContractFactory = require('./contract_factory');

/**
 * Oasis
 * This module exports the `web3.oasis` namespace. It defines the parameters
 * of the raw underlying web3 methods added to the web3 protocol, and exposes
 * the Oasis contract interface by creating an extended verison of web3.eth.Contract
 * with the ability to deploy with custom header speciying properties like
 * condientiality and expiry.
 */
class Oasis {

  constructor(web3, storage, mraebox) {
    this.keyManager = new KeyManager(web3, storage, mraebox);
    this.utils = new OasisUtils();
    this._setupRpcs(web3);
    this._setupContract(web3, storage, mraebox);
    this._setupWrappedAccounts(web3);
  }

  /**
   * Creates methods on the confidential namespace that make requests to the oasis_*
   * web3c rpc endpoints. For example, one may do `web3c.oasis.getPublicKey(address)`.
   *
   * @param {Object} web3 is a web3 object.
   */
  _setupRpcs(web3) {
    let methods = [
      // Second parameter - the long-term key - is intercepted by the provider.
      new web3.extend.Method({
        name: 'getPublicKey',
        call: 'oasis_getPublicKey',
        params: 1,
        inputFormatter: [web3.extend.formatters.inputAddressFormatter],
        outputFormatter: getPublicKeyOutputFormatter
      }),
      new web3.extend.Method({
        name: 'call',
        call: 'oasis_call_enc',
        params: 2,
        inputFormatter: [
          web3.extend.formatters.inputCallFormatter,
          web3.extend.formatters.inputDefaultBlockNumberFormatter
        ],
        outputFormatter: callOutputFormatter
      }),
      new web3.extend.Method({
        name: 'expiry',
        call: 'oasis_getExpiry',
        params: 1,
        inputFormatter: [(address) => {
          if (!address) {
            throw Error('An address must be provided to retrieve contract expiry');
          }
          return web3.extend.formatters.inputAddressFormatter(address);
        }],
        outputFormatter: (res) => res
      })
    ];

    methods.forEach((method) => {
      method.setRequestManager(web3._requestManager);
      method.attachToObject(this);
    });
  }

  /**
   * Creates the Oasis `Contract` constructor on the `oasis` namespace.
   * The `Contract` behaves in the same way as the eth `Contract` object, except
   * that it adds the ability to speciy custom properties likes expriy and
   * confidentiality. If confidentiality is set, then transparently encrypts/decrypts
   * all outgoing/incoming requests according to the web3c spec.
   */
  _setupContract(web3, storage, mraebox) {
    // Save `this` so that we can refer to it and its properties inside `ConfidentialContract`.
    // Otherwise `this` is overridden when `new` is used in `new Contract`.
    let self = this;

    this.Contract = makeContractFactory(web3, (address, options) => {
      let provider = new OasisProvider(this.keyManager, web3._requestManager);

      let keymanager = self.keyManager;

      if (options && options.saveSession === false) {
        keymanager = new KeyManager(web3, undefined, mraebox);
        provider = new OasisProvider(keymanager, web3._requestManager);
      }

      if (options && options.key) {
        keymanager.add(address, options.key);
      }

      if (address) {
        keymanager.get(address, (public_key) => {
          // TODO: update once peter merges in PR to turn error into an option.
          if (typeof public_key === 'object') {
            provider.selectBackend({ confidential: false });
          }
        });
      }

      return provider;
    });
  }

  _setupWrappedAccounts(web3) {
    let accounts = web3.eth.accounts;
    let wrappedSigner = accounts.signTransaction.bind(accounts);
    let keyManager = this.keyManager;
    accounts.signTransaction = function(tx, from) {
      // Transaction to existing address, so we check it's confidential by asking the key manager.
      if (tx.to) {
        return new Promise((resolve, reject) => {
          keyManager.get(tx.to, function (publicKey) {
            // Confidential transaction, so encrypt it.
            if (typeof public_key !== 'object') {
              const transformer = new ProviderConfidentialBackend.private.ConfidentialSendTransform(
                web3._requestManager.provider,
                keyManager
              );
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
              // Non-confidential so do nothing.
            } else {
              return wrappedSigner(tx, from);
            }
          });
        });
      }
      // Deploy transaction, so just add the deploy header.
      let backend = (new OasisProvider(keyManager, web3._requestManager)).selectBackend(tx.header);
      backend.addOasisDeployHeader(tx);
      return wrappedSigner(tx, from);
    };

    this.accounts = accounts;
  }

  resetKeymanager() {
    this.keyManager.reset();
  }
}

class OasisUtils {
  constructor() {
    this.DeployHeader = DeployHeader;
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

module.exports = Oasis;
