/* eslint-disable no-console */
/* globals Web3c */

// interactivity for the demo page.
window.addEventListener('load', function () {
  // fill in example contract data as defaults
  let xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', 'example.json', true);
  xobj.onreadystatechange = () => {
    // when loaded.
    if (xobj.readyState === 4) {
      let data = JSON.parse(xobj.responseText);
      let bc = document.getElementById('contract_bytecode');
      bc.value = data.bytecode;
      let abi = document.getElementById('call_abi');
      abi.value = JSON.stringify(data.abi);
      abi = document.getElementById('deploy_abi');
      abi.value = JSON.stringify(data.abi);
    }
  };
  xobj.send(null);

  // contract
  let contractform = document.getElementById('confidentialcontract_form');
  contractform.addEventListener('submit', onContractFormSubmit);
  //deploy
  let deployform = document.getElementById('deploy_form');
  deployform.addEventListener('submit', onDeployFormSubmit);

  //getpublickey
  let getpublickeyform = document.getElementById('getpublickey_form');
  getpublickeyform.addEventListener('submit', onPublicKeyFormSubmit);
  //call
  let callform = document.getElementById('call_enc_form');
  callform.addEventListener('submit', onCallFormSubmit);

  try {
    getProvider();
  } catch(e) {
    document.getElementById('startup').innerHTML = e.message;
  }
}, false);

function getProvider () {
  if (window.ethereum) {
    window.ethereum.enable().catch((e) => {
      console.error(e);
      document.getElementById('startup').innerHTML = e.message;
    });
    document.getElementById('provider').value = 'Injected';
    document.getElementById('provider').disabled = true;
    return window.ethereum;
  }
  let instance = new Web3c();
  if (instance.currentProvider) {
    document.getElementById('provider').value = 'Browser Provided';
    document.getElementById('provider').disabled = true;
    return instance.currentProvider;
  } else {
    return document.getElementById('provider').value;
  }
}

function onPublicKeyFormSubmit (ev) {
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
}

function onCallFormSubmit (ev) {
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
}

let currentContract = null;

function onContractFormSubmit (ev) {
  let form = document.getElementById('confidentialcontract_form');
  let abi = form.contract_abi.value;
  let address = form.contract_address.value;
  let key = form.contract_key.value || undefined;
  if (key) {
    key = {'key': key};
  }

  let webc = new Web3c(getProvider());
  try {
    currentContract = webc.confidential.Contract(JSON.parse(abi), address, key);
    buildMethodForms();
  } catch (e) {
    document.getElementById('contract_result').innerHTML = e;
  }

  ev.preventDefault();
  return false;
}

function onDeployFormSubmit (ev) {
  let form = document.getElementById('deploy_form');
  let abi = form.contract_abi.value;
  let bytecode = form.contract_bytecode.value;

  let webc = new Web3c(getProvider());
  try {
    let contract = webc.confidential.Contract(JSON.parse(abi));
    webc.eth.getAccounts().then((a) => {
      return contract.deploy({data: bytecode}).send({from: a[0]});
    }).then((c) => {
      currentContract = c;
      buildMethodForms();
    }).catch((e) => {
      document.getElementById('deploy_result').innerHTML = e;
    });
  } catch (e) {
    document.getElementById('deploy_result').innerHTML = e;
  }

  ev.preventDefault();
  return false;
}

function buildMethodForms () {
  let root = document.getElementById('contract_methods');
  root.innerHTML = '';
  currentContract._jsonInterface.forEach((method) => {
    if (method.type !== 'function') {
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
}
