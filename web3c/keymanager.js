// Stores known short and longterm keys for contracts,
// refreshing + validating short-term keys as needed.

let KeyManager = function (confidential) {
  this._DB = {};
  this._remote = confidential;
};

KeyManager.prototype.add = function (address, key) {
  this._DB[address] = {
    longterm: key
  };
};

KeyManager.prototype.get = function (address, callback) {
  if (!this._DB[address]) {
    return callback(new Error('no known contract at requested address'));
  }
  // TODO: check timestamp expiry.
  if (this._DB[address].shorterm) {
    return callback(this._DB[address].shorterm);
  }
  this._remote.getPublicKey(address, this.onKey.bind(this, address, callback));
};

KeyManager.prototype.onKey = function (address, cb, response) {
  if (!this._DB[address]) {
    throw new Error('Recieved key for unregistered address');
  }
  // TODO: check if response is an error.
  // TODO: validate response signature is from lngterm key.
  this._DB[address].shortterm = response.key;
  this._DB[address].timestamp = response.timestamp;
  cb(response.key);
};
