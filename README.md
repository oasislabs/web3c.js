# web3c.js
[![CircleCI](https://circleci.com/gh/oasislabs/web3c.js.svg?style=svg&circle-token=945fafdbfe2abf2c7b83b728a9db0eb8725edd53)](https://circleci.com/gh/oasislabs/web3c.js)[![Coverage Status](https://coveralls.io/repos/github/oasislabs/web3c.js/badge.svg?t=Q8lw6G)](https://coveralls.io/github/oasislabs/web3c.js)
A Web3 extension for confidential transactions.

## Installation / Usage
Include `web3c.js` in your project, require web3c within your webpack project, or
attach the confidentiality extension onto your existing use of Web3.

### Creating a new Web3c Project

You can either include a script tag linking the web3c library as you would a
dependency on [web3](http://github.com/ethereum/web3.js/), or use the library
with a `require` statement in either your Node or webpack project. Web3
will be automatically required by web3c in these cases and the wrapper can be
used in place of web3.

### Extending an existing Web3 project

If your dapp / project already has a web3 library, you can include the web3c
library in addition, and it will wrap around the existing web3 instance.
Our build defines web3 as an optional dependency, and the web3c library will
not depend upon the vendored web3 unless no web3 context is present in the
environment into which it is included.

If you want to convert an existing contract to confidential, you will change
the call from `new web3.eth.Contract` to `web3.confidential.Contract`. If your
project interacts with an already deployed contract, you should add the key
of the confidential contract as an additional option to this call to ensure
safety:
```javascript
let myContractInstance = web3.confidential.Contract(abi, deployed_address, {
  key: "0x59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a"
});
```

If the contract is deployed as part of your project, web3c will retrieve the
longterm key when the contract is deployed, and will attempt to store it for
subsequent uses automatically.

## Building / Development

The web3c library build uses [webpack](https://webpack.js.org/),
and can be initiated by npm. Compile with `npm run-script build`, or
develop interactively with `npm run-script watch`.

Tests are run by CI, ensuring that the library is in a state the builds, that
all tests pass, and that the code passes a lint check. These tests can be
run locally with `npm test`. An additional set of browser integration tests
are run manually before releases to ensure functionality on the range of
expected environments. These can be run via the command
`npm run-script test:browser`.

### Webpack Integration

Web3c is structured with a ["soft"](https://webpack.js.org/guides/code-splitting/)
dependency on web3. This means that a default compilation of a project requiring
web3c with webpack will not have web3 loaded synchronously. This choice adds
a bit of complexity you should be aware of, but is useful because it allows your
project to load faster and never trigger the full download of web3 in cases where
the injected wallet in the user's browser already contains a copy.

There are two recommeded strategies for handling loading of web3c in a webpack
project:

* **Synchronous web3** You can make sure the web3 dependency ends up in the same
webpack code module by including it as a direct dependnecy:
```javascript
const web3c = require('web3c');
require('web3'); // eslint-disable-line no-unused-expressions
```
Note: You don't ned to use web3, as all of its methods are accessible through the
web3c object. Adding a `require` call somewhere in your project is a simple way
to pull the dependent code into the same code module for synchronous use.

* **Asynchronous web3** You can defer usage of web3c until web3 is available:
```javascript
const web3c = require('web3c');
...
web3c.Promise.then(initialize);
```
