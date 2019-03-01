/* globals describe,it,before,after */
const assert = require('assert');
const ConfidentialProvider = require('../web3c/provider_confidential_backend');

let mockSigner = {
	verify: (_sign, _key, _timestamp) => { /* no-op */ }
};

let mockKeyManager = {
  get: (to, callback) => { callback(null, 'key'); },
  encrypt: (value) => { return new Promise((resolve, reject) => resolve(value)); },
  decrypt: (value) => { return new Promise((resolve, reject) => resolve(value)); }
};

let mockManager = {
  addSubscription: () => { /* no-op */ },
  removeSubscription: () => { /* no-op */ },
  clearSubscriptions: () => { /* no-op */ },
  provider: null
};

class ResponseCollector {
  constructor(done) {
    this.responses = [];
    this.timeout = null;
  }

  _clear() {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  collect(expected, done, timeout = 1000) {
    if (this.timeout) {
      throw new Error('already collecting responses');
    }

    this.timeout = setTimeout(() => {
      this._clear();
      done(new Error('timeout'), this);
    }, timeout);

    return (err, res) => {
      this.responses.push({ err, res });

      if (this.responses.length === expected) {
        this._clear();
        done(null, this);
      }
    };
  }
}

class NetworkProvider {
  constructor() {
    this.responses = [];
  }

  pushResponse(err, res = {}) {
    this.responses.push({ err, res });
  }

  send(payload, callback) {
    if (this.responses.length === 0) {
      throw new Error('no responses set up for NetworkProvider');
    }

    let response = this.responses.pop();
    callback(response.err, response.res);
  }
}

describe('ConfidentialProvider', () => {

  let keymanager;
  let provider;

  beforeEach(() => {
    mockManager.provider = new NetworkProvider();
    provider = new ConfidentialProvider(mockKeyManager, mockManager);
  });

  it('should call callback for ethCall only once on error', (done) => {
    let senderr = new Error();
    mockManager.provider.pushResponse(senderr);
    let collector = new ResponseCollector();

    provider.send({ method: 'eth_call', params: [{ to: 'to' }]}, collector.collect(2, (err, collector) => {
      assert.equal(!!err, true);
      assert.equal(err.message, 'timeout');
      assert.equal(collector.responses.length, 1);
      assert.equal(collector.responses[0].err, senderr);
      done();
    }));
  });

  it('should call callback for ethCall when result not present', (done) => {
    mockManager.provider.pushResponse(null, {result: undefined});
    let collector = new ResponseCollector();

    provider.send({ method: 'eth_call', params: [{ to: 'to' }]}, collector.collect(2, (err, collector) => {
      assert.equal(!!err, true);
      assert.equal(err.message, 'timeout');
      assert.equal(collector.responses.length, 1);
      assert.equal(collector.responses[0].err.message, 'response missing result');
      done();
    }));
  });
});
