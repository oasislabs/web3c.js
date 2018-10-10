// interactivity for the demo page.
window.addEventListener('load', function() {
  // contract
  let contractform = document.getElementById('confidentialcontract_form');
  contractform.addEventListener('submit', oncontractform_submit);
  //getpublickey
  let getpublickeyform = document.getElementById('getpublickey_form');
  getpublickeyform.addEventListener('submit', onpublickeyform_submit);
  //call
  let callform = document.getElementById('call_enc_form');
  callform.addEventListener('submit', oncallform_submit);
}, false);

const getProvider = function () {
  let instance = new Web3c();
  if (instance.currentProvider !== undefined) {
    document.getElementById('provider').value = 'Browser Provided';
    document.getElementById('provider').disabled = true;
    return instance.currentProvider;
  } else {
    return document.getElementById('provider').value;
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

const oncallform_submit = function (ev) {
  let callform = document.getElementById('call_enc_form');
  let addr = callform.contract_address.value;
  let data = callform.data.value;

  // Make call.
  let webc = new Web3c(getProvider());
  try {
    webc.confidential.call(addr, data).then(function (resp) {
      console.log(resp);
    });
  } catch (e) {
    document.getElementById('call_enc_result').innerHTML = e;
  }

  ev.preventDefault();
  return false;
};

let currentContract = null;

const oncontractform_submit = function (ev) {
  let form = document.getElementById('confidentialcontract_form');
  let abi = form.contract_abi.value;
  let address = form.contract_address.value;
  let key = form.contract_key.value;

  let webc = new Web3c(getProvider());
  try {
    currentContract = webc.confidential.Contract(JSON.parse(abi), address, key);
    buildmethodforms();
  } catch (e) {
    document.getElementById('contract_result').innerHTML = e;
  }

  ev.preventDefault();
  return false;
};

const buildmethodforms = function () {
  let root = document.getElementById('contract_methods');
  root.innerHTML = "";
  currentContract._jsonInterface.forEach((method) => {
    if (method.type !== "function") {
      return;
    }
    let form = document.createElement('form');
    form.addEventListener('submit', (ev) => {
      let inputvals = form.getElementsByClassName('input');
      inputvals = Array.prototype.map.call(inputvals, (i) => i.value);

      let mthd = currentContract.methods[method.name].apply({}, inputvals);
      try {
        if(method.constant) {
          mthd.call().then(function (resp) {
            console.log(resp);
          });
        } else {
          mthd.send().then(function (resp) {
            console.log(resp);
          });
        }
      } catch (e) {
        document.getElementById('contract_result').innerHTML = e;
      }

      ev.preventDefault();
      return false;
    });

    let caption = document.createElement('caption');
    caption.innerHTML = method.name;
    form.appendChild(caption);

    let args = method.inputs;
    args.forEach((arg) => {
      let input = document.createElement('input');
      input.className = 'input';
      input.name = arg.name;
      input.placeholder = arg.name;
      form.appendChild(input);
    });

    let submit = document.createElement('input');
    submit.value = method.name;
    submit.type = 'submit';
    form.appendChild(submit);

    root.appendChild(form);
  });
};
