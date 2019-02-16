/**
 * @returns a constructor to create a web3.eth.Contract object. The `Contract` object
 *          here has Oasis specific functionality, such as the ability to specify the
 *          Oasis contract header upon deploy and the ability to retrieve contract
 *          expiry from an instance of such a Contract. This is used in both confidential
 *          and non confidential settings.
 * @param   {Object} provider is the Contract's web3 provider receiving  all requests going
 *          to/from the Contract object.
 * @param   {Function?} providerFn is a block to execute returning a new provider based upon
 *          options given upon constructing the contract. In confidential contracts, for
 *          example, { saveSession: false }.
 */
function make(web3, providerFn) {
  let EthContract = web3.eth.Contract;
  /**
   * @param {Object} abi
   * @param {String} address
   * @param {Object} options
   * @param {String} options.key The longterm key of the contract.
   * @param {bool}   options.saveSession false to disable storing keys.
   */
  return function OasisEthContract(abi, address, options) {
    let c = new EthContract(abi, address, options);

    Object.assign(this, c);
    this.__proto__ = c.__proto__;

    // Object.DefineProperty's are not copied otherwise.
    this.defaultAccount = c.constructor.defaultAccount;
    this.defaultBlock = c.constructor.defaultBlock || 'latest';

    c.setProvider.call(this, providerFn(options));

    this.clone = () => {
      return new OasisEthContract(this.options.jsonInterface, this.options.address, this.options);
    };
    // Hook deploy so that we can pass in the Oasis contract deployment header
    // as an extra argument. For example, contract.deploy({ data, header: { expiry } });
    // To do this, we need to also hook into all the methods available on the returned
    // tx object so that we can pass in such deploy options into them.
    this.deploy = (deployOptions, callback) => {
      deployOptions = Object.assign({}, deployOptions);
      // Create the txObject that we want to patch and return.
      let txObject = c.deploy.call(this, deployOptions, callback);

      // Methods we want to hook into.
      let _send = txObject.send;
      let _estimateGas = txObject.estimateGas;

      // Perform patches.
      txObject.send = (options) => {
        options = Object.assign({}, options);
        options.header = deployOptions.header;
        return _send.call(this, options);
      };
      txObject.estimateGas = (options) => {
        options = Object.assign({}, options);
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
  }

}

module.exports = {
  make
};
