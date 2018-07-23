// Web3 Privacy extension.

var mrae_box = require("./mrae_box");

if (typeof web3 !== "undefined") {
  web3.extend({
    property: 'private',
    methods: [{
      name: 'getPublicKey',
      call: 'eth_getPublicKey',
      params: 0
    }, {
      name: 'sendRawTransaction',
      call: 'eth_sendRawTransaction_enc',
      params: 2,
      inputFormatters: [web3.extend.formatters.inputAddressFormatter, null],
      outputFormatter: web3.extend.formatters.outputTransactionReceiptFormatter
    }, {
      name: 'call',
      call: 'eth_call_enc',
      params: 2,
      inputFormatters: [web3.extend.formatters.inputAddressFormatter, null]
    }]
  });
}
