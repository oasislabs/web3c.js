// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.

function KeyManager (web3) {
  this._db = new Map();
  this._web3 = web3;
}

KeyManager.prototype.add = function (address, key) {
  this._db[address] = {
    longterm: key
  };
};

KeyManager.prototype.get = function (address, callback) {
  if (!this._db[address]) {
    return callback(new Error('no known contract at requested address'));
  }
  // TODO: check timestamp expiry.
  if (this._db[address].shorterm) {
    return callback(this._db[address].shorterm);
  }
  this._web3.confidential.getPublicKey(address, this.onKey.bind(this, address, callback));
};

KeyManager.prototype.onKey = function (address, cb, response) {
  if (!this._db[address]) {
    throw new Error('Recieved key for unregistered address');
  }
  // TODO: check if response is an error.
  // TODO: validate response signature is from lngterm key.
  // TODO: reformat / parse.
  this._db[address].shortterm = response.key;
  this._db[address].timestamp = response.timestamp;
  cb(response.key);
};

module.exports = KeyManager;
