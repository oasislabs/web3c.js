// interactivity for the demo page.
window.addEventListener('load', function() {
  //provider
  getProvider();

  //getpublickey
  var getpublickeyform = document.getElementById('getpublickey_form');
  getpublickeyform.addEventListener('submit', onpublickeyform_submit);
}, false);

var getProvider = function () {
  var ex = new Web3();
  if (ex.currentProvider !== undefined) {
    document.getElementById('provider').value = 'Browser Provided';
    document.getElementById('provider').disabled = true;
    return undefined;
  } else {
    return new Web3.providers.HttpProvider(document.getElementById('provider').value);
  }
}

var onpublickeyform_submit = function (ev) {
  var getpublickeyform = document.getElementById('getpublickey_form');
  var addr = getpublickeyform.contract_address.value;

  // Make call.
  var webc = new Web3c(getProvider());
  try {
    webc.confidential.getPublicKey(addr).then(function (resp) {
      console.log(resp);
    });
  } catch (e) {
    console.error(e);
  }

  ev.preventDefault();
  return false;
};
