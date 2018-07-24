module.exports = function (web3, address) {
  var shadowContract = {address: address};

  var contract = {
    getPublicKey: async function () {
      if (shadowContract.publicKey) {
        return shadowContract.publicKey;
      } else {
        shadowContract.publicKey = await web3.private.getPublicKey(shadowContract.address);
        // TODO: validate public key
        return shadowContract.publicKey
      }
    }
  };

  shadowContract.call = async function () {
    var publicKey = await this.getPublicKey();
    var plaintext = arguments; // TODO: format plaintext.
    var nonce = crypto.randomBytes(16);
    var cyphertext = await mraeBox.Seal(publicKey, nonce, plaintext, new Uint8Array([]));
    web3.private.call(shadowContract.address, cyphertext);
  };

  shadowContract.txn = async function () {
    var publicKey = await this.getPublicKey();
    var plaintext = arguments; // TODO: format plaintext.
    var nonce = crypto.randomBytes(16);
    var cyphertext = await mraeBox.Seal(publicKey, nonce, plaintext, new Uint8Array([]));
    web3.private.sendRawTransaction(shadowContract.address, cyphertext);
  };

  //TODO: use web3 to map methods.

  return contract;
};
