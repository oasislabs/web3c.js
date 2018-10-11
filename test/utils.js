const fs = require('fs');

/**
 * Returns a contract build artifact containing the abi and bytecode.
 * Assumes all files are compiled with truffle compile before hand.
 */
function read_artifact(contractName) {
  const path = './test/build/contracts/' + contractName + '.json';
  return JSON.parse(fs.readFileSync(path).toString());
}

module.exports = {
  read_artifact
}
