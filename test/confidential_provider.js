/* globals describe,it*/
const assert = require('assert')

const ConfidentialProvider = require('../web3c/confidential_provider.js');
const ConfidentialSendTransform = ConfidentialProvider.private.ConfidentialSendTransform;

describe('ConfidentialSendTransform', () => {

  const transform = new ConfidentialSendTransform(null, null);

  // [description, input, expectedOutput] test cases
  const cases = [
    ['should prepend a confidential prefix to a hex string', '0x12', '0x0070726912'],
    ['should not prepend a confidential prefix if it already exists', '0x0070726913', '0x0070726913'],
    ['should not prepend a confidential prefix if the input is not a byte string', 'testing', 'testing'],
    ['should not prepend a confidential prefix if the input is an empty string', '', '']
  ];

  cases.forEach((testCase) => {
    it(testCase[0], () => {
      const result = transform._prependConfidential(testCase[1]);
      assert.equal(testCase[2], result);
    });
  });
});
