# web3c.js
[![CircleCI](https://circleci.com/gh/oasislabs/web3c.js.svg?style=svg)](https://circleci.com/gh/oasislabs/web3c.js)
A Web3 extension for confidential transactions.

## Installation / Usage
Include `web3c.js` in your project, build the web3c library as part of your use of
Web3 (see below), or attach the confidentiality extension onto your existing use
of Web3.

### Creating a new Web3c Project
### Extending an existing Web3 project
### Extending an existing library using Web3

## Building / Development

Building of the web3c library is managed by [webpack](https://webpack.js.org/),
and can be initiated by npm. Run a compilation using `npm run-script build`, or
develop interactively using `npm run-script watch`.

Tests are run by CI, ensuring that the library is in a state the builds, that
all tests pass, and that the code passes a lint check. These tests can be
run locally using `npm test`. An additional set of browser integration tests
are run manually before releases to ensure functionality on the range of
expected environments. These can be run via the command
`npm run-script test:browser`.
