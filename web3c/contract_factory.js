const utils = require('./utils');
const DeployHeader = require('./deploy_header');

/**
 * Creates a contract constructor.
 *
 * @returns a constructor to create a web3.eth.Contract object. The `Contract` object
 *          here has Oasis specific functionality, such as the ability to specify the
 *          Oasis contract header upon deploy and the ability to retrieve contract
 *          expiry from an instance of such a Contract. This is used in both confidential
 *          and non confidential settings.
 * @param   {Object} web3 the web3 object.
 * @param   {Function?} providerFn is a block to execute returning the contract's provider.
 *          The providerFn should take one argument, the options given upon invoking the
 *          Contract constructor, for example { saveSession: false } for confidential
 *          contracts.
 */
function makeContractFactory(web3, providerFn) {
  let EthContract = web3.eth.Contract;
  /**
   * @param {Object} abi
   * @param {String} address
   * @param {Object} options
   * @param {String} options.key The longterm key of the contract.
   * @param {bool}   options.saveSession false to disable storing keys.
   * @param {RequestManager?} manager is provided iff the clone method has been called. This
   *        is used in the case where we have deployed an OasisContract via `send` and we want
   *        to return a new version of the OasisContract with the same provider set.
   */
  return function OasisContract(abi, address, options, manager) {
    let c = new EthContract(abi, address, options);

    utils.objectAssign(this, c, true, true);
    this.__proto__ = c.__proto__;

    // Object.DefineProperty's are not copied otherwise.
    this.defaultAccount = c.constructor.defaultAccount;
    this.defaultBlock = c.constructor.defaultBlock || 'latest';

    if (manager) {
      this._requestManager = manager;
    } else if (this._requestManager.provider) {
      this._requestManager = new this._requestManager.constructor(providerFn(address, options));
    }

    this.clone = () => {
      return new OasisContract(this.options.jsonInterface, this.options.address, this.options, this._requestManager);
    };
    // Hook deploy so that we can pass in the Oasis contract deployment header
    // as an extra argument. For example, contract.deploy({ data, header: { expiry } });
    // To do this, we need to also hook into all the methods available on the returned
    // tx object so that we can pass in such deploy options into them.
    this.deploy = (deployOptions, callback) => {
      deployOptions = deployOptions || {};

      // Configure the provider to be confidential (or not) based upon the contract's deploy header.
      this._requestManager.provider.backend = Promise.resolve(this._requestManager.provider.getBackend(deployOptions.header));

      // Create the txObject that we want to patch and return.
      let txObject = c.deploy.call(this, deployOptions, callback);

      // Methods we want to hook into.
      let _send = txObject.send;
      let _estimateGas = txObject.estimateGas;

      // Perform patches.
      txObject.send = (options) => {
        options = options || {};
        options.header = deployOptions.header;
        return _send.call(this, options);
      };
      txObject.estimateGas = (options) => {
        options = options || {};
        options.header = deployOptions.header;
        return _estimateGas.call(this, options);
      };

      // Return the patched object.
      return txObject;
    };

    let expiry = new web3.extend.Method({
      name: 'expiry',
      call: 'oasis_getExpiry',
      params: 1,
      inputFormatter: [(address) => {
        if (!address) {
          address = this.options.address;
        }
        return web3.extend.formatters.inputAddressFormatter(address);
      }],
      outputFormatter: (res) => res
    });
    expiry.setRequestManager(web3._requestManager);
    expiry.attachToObject(this);

    this.getHeader = async () => {
      let body = await web3.eth.getCode(address);
      return DeployHeader.private.DeployHeaderHexReader.body(body);
    }
  }

}

module.exports = makeContractFactory;
