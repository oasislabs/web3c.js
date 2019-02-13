/* globals describe,it */
const assert = require('assert');
const DeployHeader = require('../web3c/deploy_header');

describe('DeployHeader', function() {

  it('errors when writing a deploy header to empty bytecode', async function() {
	let bytecode = '';
	let header = { expiry: 100000, confidential: false};

	assert.throws(() => DeployHeader.write(header, bytecode));
  });

  let tests = [
	{
	  description: 'writes a deploy header to non-empty bytecode',
	  bytecode: '0x1234',
	  header: { expiry: 100000, confidential: false},
	  expected: '0x0073697300010026{"expiry":100000,"confidential":false}1234'
	},
	{
	  description: 'overwrites a deploy header to non-empty bytecode with an existing confidential header',
	  bytecode: '0x0073697300010016{"confidential":false}1234',
	  header: { confidential: true},
	  expected: '0x0073697300010015{"confidential":true}1234'
	},
	{
	  description: 'overwrites a deploy header to non-empty bytecode with an existing expiry header',
	  bytecode: '0x0073697300010011{"expiry":100000}1234',
	  header: { expiry: 100001},
	  expected: '0x0073697300010011{"expiry":100001}1234'
	},
	{
	  description: 'overwrites a deploy header to non-empty bytecode with an existing expiry and confidential header',
	  bytecode: '0x0073697300010026{"expiry":100000,"confidential":false}1234',
	  header: { expiry: 100001, confidential: true},
	  expected: '0x0073697300010025{"expiry":100001,"confidential":true}1234'
	}
  ];

  tests.forEach((test) => {
	it(test.description, function() {
	  let data = DeployHeader.write(test.header, test.bytecode);
	  assert.equal(data, test.expected);
	});
  });
});
