function makeWeb3c (web3) {
  return function (provider) {
    var obj = new web3(provider);
    return obj;
  }
}

if (typeof Web3 === 'undefined') {
  require.ensure(['web3'], function (req) {
    var web3 = require('web3');
    module.exports = makeWeb3c(web3);
  }, function (err) {
    console.error("Failed to find Web3.");
  }, 'web3');
} else {
  module.exports = makeWeb3c(Web3);
}
