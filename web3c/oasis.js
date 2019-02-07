const DeployHeader = require('./deploy_header');

class Oasis {
  constructor(web3) {
    this._setupExpiry(web3);
    this.utils = new OasisUtils();
  }

  _setupExpiry(web3) {
    let expiry = new web3.extend.Method({
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
    });
    expiry.setRequestManager(web3._requestManager);
    expiry.attachToObject(this);
  }
}

class OasisUtils {
  constructor() {
    this.DeployHeader = DeployHeader;
  }
}

module.exports = Oasis;
