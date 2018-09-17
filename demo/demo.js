// interactivity for the demo page.
window.addEventListener('load', function() {
  //getpublickey
  var getpublickeyform = document.getElementById('getpublickey_form');
  getpublickeyform.addEventListener('submit', onpublickeyform_submit);
}, false);

var onpublickeyform_submit = function (ev) {
  var getpublickeyform = document.getElementById('getpublickey_form');
  var addr = getpublickeyform.contract_address.value;

  // Make call.
  web3.eth_getPublicKey()

  ev.preventDefault();
  return false;
};
