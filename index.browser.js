import '@babel/polyfill';

// Web3c
var Web3c = require('./web3c');

// dont override global variable
if (typeof window !== 'undefined' && typeof window.Web3c === 'undefined') {
  window.Web3c = Web3c;
}

export default Web3c;
