const http = require('http');
const web3 = require('web3');

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
    res.end(JSON.stringify(handleRequest(jsonreq)));
  });
};

function handleRequest (req) {
  let obj = {
    'jsonrpc': '2.0',
    'id': req.id,
  };
  if(req.method == 'confidential_getPublicKey') {
    obj.result = {
      //TODO: key.
      'key': 0,
      'timestamp': web3.utils.toHex((new Date()).valueOf()),
      'signature': 0,
    };
  }
  return obj;
}

module.exports = function () {
  return http.createServer(onReq);
};
