const fs = require("fs");

function read_artifact(contractName) {
  const path = "./test/build/contracts/" + contractName + ".json";
  return JSON.parse(fs.readFileSync(path).toString());
}

module.exports = {
  read_artifact
}
