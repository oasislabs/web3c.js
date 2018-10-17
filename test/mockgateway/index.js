// A mock gateway for testing web3c methods.
// Uses a fixed key for operations.
const http = require('http');
const web3 = require('web3');
const buffer = require('buffer');
const nacl = require('tweetnacl');
const responses = require("./responses");
const keymanager = require('../../web3c/keymanager');
const artifact = require('../../demo/example.json');

const onReq = function (req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    let jsonreq = JSON.parse(body);
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Access-Control-Allow-Origin': '*',
    });
    handleRequest(jsonreq).then(resp => res.end(JSON.stringify(resp)));
  });
};

async function handleRequest (req) {
  let obj = {
    'jsonrpc': '2.0',
    'id': req.id,
    'result': []
  };
  // Arbitrarily chosen.
  let manager = new keymanager();
  manager.secretKey = new Uint8Array(Buffer.from(
    '263357bd55c11524811cccf8c9303e3298dd71abeb1b20f3ea7db07655dba9e9', 'hex'));
  manager.publicKey = new Uint8Array(Buffer.from(
    '59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a', 'hex'));

  if (req.method == 'confidential_getPublicKey') {
    obj.result = {
      'key': '0x59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a',
      'timestamp': web3.utils.toHex((new Date()).valueOf()),
      'signature': 0,
    };
  } else if (req.method == 'confidential_call_enc') {
    let encdata = req.params[0].data;
    // slice out the key: 0x || nonce || public_key || cypher
    let pubKeyStart = 2 + 32;
    let pubKeyEnd = pubKeyStart + 64;
    if (encdata.length < pubKeyEnd) {
      throw "invalid confidential_call_enc data field";
    }
    let pubKey = encdata.substring(pubKeyStart, pubKeyEnd);
    obj.result = await manager.encrypt('0x0000000000000000000000000000000000000000000000000000000000000001', pubKey);
  } else if (req.method == 'eth_sendTransaction') {
    let encdata = req.params[0].data;
    if (encdata.startsWith("0x")) {
      encdata = encdata.substr(2);
    }
    // remove 0x + pri before decrypting

    // Deploy.
    if (!req.params[0].to) {
      // "\0pri"
      if (!encdata.startsWith("00707269")) {
        obj.result = "error";
      } else {
        // send a arbitrary txn hash.
        obj.result = responses.CONFIDENTIAL_DEPLOY_TX_HASH;
      }
    } else {
      // Transact
      try {
        let plaindata = await manager.decrypt(encdata);
        obj.result = "0x000000000000000000000000000000000000000000000000000000000000000e";
      } catch (e) {
        console.warn('unable to decrypt:', e);
        obj.result = "error";
      }
    }
  } else if (req.method == 'eth_getTransactionReceipt') {
    if (req.params[0] == responses.CONFIDENTIAL_DEPLOY_TX_HASH) {
      obj.result = responses.CONFIDENTIAL_DEPLOY_TX_RECEIPT;
    } else if (req.params[0] == "0x000000000000000000000000000000000000000000000000000000000000000e") {
      // txn call
      obj.result = {
        "transactionHash": "0x2",
        "transactionIndex": "0x1",
        "blockHash": "0x2",
        "blockNumber": "0x2",
        "contractAddress": null,
        "logs": [],
        "blockHash": 1,
        "status": "0x1",
      };
    }
  } else if (req.method == 'eth_getCode') {
    obj.result = artifact.bytecode;
  } else if (req.method == 'eth_getPastLogs') {
	if (req.params[0] === responses.CONFIDENTIAL_GET_PAST_LOGS.address) {
	  obj.result = responses.CONFIDENTIAL_GET_PAST_LOGS;
	}
  }

  return obj;
}

module.exports = function () {
  return http.createServer(onReq);
};
