const http = require('http');

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
  if(req.method == "confidential_getPublicKey") {
    return {"jsonrpc": "2.0", "id": req.id, "result": "0x1"};
  } else {
    return {"jsonrpc": "2.0", "id": req.id, "result": "0x0"};
  }
}

module.exports = function () {
  return http.createServer(onReq);
};
