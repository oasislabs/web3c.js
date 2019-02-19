// A mock gateway for testing web3c methods.
// Uses a fixed key for operations.
const http = require('http');
const web3 = require('web3');
const ethers = require('ethers');

const responses = require('./responses');
const keymanager = require('../../web3c/key_manager');
const artifact = require('../../demo/example.json');
const MraeBox = require('../../crypto/node/mrae_box');
const DeployHeader = require('../../web3c/deploy_header');
const DeployHeaderHexReader = DeployHeader.private.DeployHeaderHexReader;

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
  let manager = new keymanager(null, undefined, MraeBox);
  manager._db.setItem('me', JSON.stringify({
    'secretKey': '0x263357bd55c11524811cccf8c9303e3298dd71abeb1b20f3ea7db07655dba9e9',
    'publicKey': '0x59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a'
  }));
  if (req.method == 'oasis_getPublicKey') {
    // If requesting public key for a contract that doesn't exist, then we should not
    // provide a valid response, so exit.
    if (req.params[0] == '0x0000000000000000000000000000000000000000') {
      return;
    }
    obj.result = {
      'public_key': '0x59e35409ffdb0be6a74acc88d5e99e2b50782662fa5bf834b8b9d53bc59c7c4a',
      'timestamp': web3.utils.toHex((new Date()).valueOf()),
      'signature': '0x0',
    };
  } else if (req.method == 'oasis_call_enc') {
    let encdata = req.params[0].data;
    // slice out the key: 0x || nonce || public_key || cypher
    let pubKeyStart = 2 + 32;
    let pubKeyEnd = pubKeyStart + 64;
    if (encdata.length < pubKeyEnd) {
      throw 'invalid oasis_call_enc data field';
    }
    let pubKey = encdata.substring(pubKeyStart, pubKeyEnd);
    obj.result = await manager.encrypt('0x0000000000000000000000000000000000000000000000000000000000000001', pubKey);
  } else if (req.method == 'eth_sendTransaction') {
    let encdata = req.params[0].data;
    if (encdata.startsWith('0x')) {
      encdata = encdata.substr(2);
    }
    // remove 0x + enc before decrypting

    // Deploy.
    if (!req.params[0].to) {
      if (req.params[0].from === responses.MALFORMED_SIGNATURE_FROM_ADDRESS) {
        obj.result = responses.MALFORMED_SIGNATURE_DEPLOY_TX_HASH;
      }
      // Testing the oasis deployment header.
      else if (req.params[0].from === responses.OASIS_DEPLOY_HEADER_ADDRESS) {
        try {
          validateHeader(req.params[0].data);
          obj.result = responses.OASIS_DEPLOY_HEADER_TX_HASH;
        } catch (e) {
          obj.result = `error: ${e}`;
        }
      } else if (req.params[0].from === responses.OASIS_DEPLOY_HEADER_PLAINTEXT_ADDRESS) {
        let header = DeployHeaderHexReader.header(req.params[0].data);
        if (header.body.confidential === false) {
          obj.result = responses.OASIS_DEPLOY_HEADER_PLAINTEXT_TX_HASH;
        } else {
          obj.result = 'error';
        }
      } else if (!encdata.startsWith(DeployHeader.prefix())) {
        // "\0enc"
        obj.result = 'error';
      } else {
        obj.result = responses.CONFIDENTIAL_DEPLOY_TX_HASH;
      }
    } else if (req.params[0].to === responses.OASIS_DEPLOY_PLAINTEXT_TX_RECEIPT.contractAddress) {
      obj.result = responses.OASIS_PLAINTEXT_TX_HASH;
    } else {
      // Transact
      try {
        await manager.decrypt(encdata);
        obj.result = '0x000000000000000000000000000000000000000000000000000000000000000e';
      } catch (e) {
        obj.result = 'error' + e;
      }
    }
  } else if (req.method == 'eth_getTransactionReceipt') {
    if (req.params[0] === responses.MALFORMED_SIGNATURE_DEPLOY_TX_HASH) {
      obj.result = responses.MALFORMED_SIGNATURE_DEPLOY_TX_RECEIPT;
    } else if (req.params[0] == responses.CONFIDENTIAL_DEPLOY_TX_HASH) {
      obj.result = responses.CONFIDENTIAL_DEPLOY_TX_RECEIPT;
    } else if (req.params[0] == '0x000000000000000000000000000000000000000000000000000000000000000e') {
      // txn call
      obj.result = {
        'transactionHash': '0x2',
        'transactionIndex': '0x1',
        'blockHash': '0x2',
        'blockNumber': '0x2',
        'contractAddress': null,
        'logs': [],
        'status': '0x1',
      };
    } else if (req.params[0] == responses.OASIS_DEPLOY_HEADER_TX_HASH) {
      obj.result = responses.OASIS_DEPLOY_TX_RECEIPT;
    } else if (req.params[0] === responses.OASIS_DEPLOY_HEADER_PLAINTEXT_TX_HASH) {
      obj.result = responses.OASIS_DEPLOY_PLAINTEXT_TX_RECEIPT;
    } else if (req.params[0] === responses.OASIS_PLAINTEXT_TX_HASH) {
      obj.result = responses.OASIS_PLAINTEXT_TX_RECEIPT;
    }
  } else if (req.method == 'eth_getCode') {
    obj.result = artifact.bytecode;
  } else if (req.method == 'eth_getLogs') {
    if (req.params[0].address === responses.CONFIDENTIAL_GET_PAST_LOGS[0].address) {
      obj.result = responses.CONFIDENTIAL_GET_PAST_LOGS;
    }
  } else if (req.method == 'eth_estimateGas') {
    if (req.params[0].from == responses.OASIS_DEPLOY_HEADER_ADDRESS) {
      try {
        validateHeader(req.params[0].data);
        obj.result = responses.OASIS_DEPLOY_HEADER_GAS;
      } catch (err) {
        obj.result = `error: ${err}`;
      }
    } else if (req.params[0].data.startsWith('0x' + DeployHeader.prefix())) {
      obj.result = '0xe1bd';
    } else {
      obj.result = '0xe185';
    }
  } else if (req.method == 'net_version') {
    obj.result = '42261';
  } else if (req.method == 'eth_getTransactionCount') {
    obj.result = '0x8';
  } else if (req.method == 'eth_sendRawTransaction') {
    let txn = ethers.utils.parseTransaction(req.params[0])
    if (!txn.to && txn.data.startsWith('0x' + DeployHeader.prefix())) {
      obj.result = responses.CONFIDENTIAL_DEPLOY_TX_HASH;
    } else if(txn.to) {
      obj.result = responses.CONFIDENTIAL_DEPLOY_TX_HASH;
    } else {
      throw new Error('raw transactions need to be confidential');
    }
  } else if (req.method == 'eth_gasPrice') {
    obj.result = '0x1';
  } else if (req.method === 'oasis_getExpiry') {
    if (req.params[0] === responses.CONFIDENTIAL_DEPLOY_TX_RECEIPT.contractAddress) {
      obj.result = responses.OASIS_DEPLOY_HEADER_EXPIRY;
    }
  } else {
    console.log(req);
  }
  return obj;
}

function validateHeader(txData) {
  let header = DeployHeaderHexReader.header(txData);
  if (header === null || header.version !== 1 || header.body.expiry !== responses.OASIS_DEPLOY_HEADER_EXPIRY || header.body.confidential !== true) {
    throw Error("Invalid deployment header");
  }
}

module.exports = {
  start: function () {
    return http.createServer(onReq);
  },
  responses
};
