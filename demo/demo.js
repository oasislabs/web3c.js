// interactivity for the demo page.
(function() {
  window.addEventListener('load', function() {
    //provider
    getProvider();

    //getpublickey
    let getpublickeyform = document.getElementById('getpublickey_form');
    getpublickeyform.addEventListener('submit', onpublickeyform_submit);
  }, false);

  const getProvider = function () {
    let ex = new Web3();
    if (ex.currentProvider !== undefined) {
      document.getElementById('provider').value = 'Browser Provided';
      document.getElementById('provider').disabled = true;
      return undefined;
    } else {
      return new Web3.providers.HttpProvider(document.getElementById('provider').value);
    }
  }

  const onpublickeyform_submit = function (ev) {
    let getpublickeyform = document.getElementById('getpublickey_form');
    let addr = getpublickeyform.contract_address.value;

    // Make call.
    let webc = new Web3c(getProvider());
    try {
      webc.confidential.getPublicKey(addr).then(function (resp) {
        console.log(resp);
      });
    } catch (e) {
      document.getElementById('getpublickey_result').innerHTML = e;
    }

    ev.preventDefault();
    return false;
  };
})();
