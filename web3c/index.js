/* globals Web3 */
const PrivateContract = require('./contract');

function makeWeb3c (web3) {
  return function (provider) {
    let obj = new web3(provider);
    obj._extend({
      property: 'confidential',
      methods: PrivateContract.methods(obj._extend)
    });
    return obj;
  }
}

if (typeof Web3 === 'undefined') {
  require.ensure(['web3'], function (req) {
    const web3 = req('web3');
    module.exports = makeWeb3c(web3);
  }, function (err) {
    throw err;
  }, 'web3');
} else {
  module.exports = makeWeb3c(Web3);
}
