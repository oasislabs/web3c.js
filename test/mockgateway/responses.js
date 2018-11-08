const CONFIDENTIAL_DEPLOY_TX_HASH = '0xb3aa525f3564e8b30262fb931988888bbb203692bba9763a45c61b25ce531846';
const CONFIDENTIAL_DEPLOY_TX_RECEIPT = {
  blockHash: '0xe480f8da480d04f7944b24bc12d19243c1979e83004451f868117cea29fb3bf1',
  blockNumber: '0x32',
  contractAddress: '0x5e0c135583ad36933ec1b36e8d034b15b747dd2e',
  cumulativeGasUsed: '0xe1bd',
  gasUsed: '0xe1bd',
  logs: [
    {
      address: '0x5e0c135583ad36933ec1b36e8d034b15b747dd2e',
      blockHash: '0x3640f09fc74d999ef2487effff4a62371229cfad6cb9502e34d67cf57cc49e2a',
      blockNumber: '0x40',
      // long term public key for the confidential contract
      data: '0x9385b8391e06d67c3de1675a58cffc3ad16bcf7cc56ab35d7db1fc03fb227a54',
      logIndex: '0x0',
      topics: [ '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ],
      transactionHash: '0xfdda2078efec4343ac47769b8694ff401acab702b82e44c6a90479b08a15ef16',
      transactionIndex: '0x0',
      transactionLogIndex: '0x0',
      type: 'mined'
    }
  ],
  status: '0x1',
  transactionHash: '0xb3aa525f3564e8b30262fb931988888bbb203692bba9763a45c61b25ce531846',
  transactionIndex: '0x0'
};
/**
 * Response from web3.eth.getPastLogs({address: [CONFIDENTIAL_CONTRACT]});
 */
const CONFIDENTIAL_GET_PAST_LOGS = [{
  address: '0x5e0c135583ad36933ec1b36e8d034b15b747dd2e',
  blockHash: '0x22da19be279655422aa276c6e14779846e75edd7dc2366285643c62010d354d7',
  blockNumber: 116,
  // encrypted event 0x nonce || public_key || cypher
  data: '0x010101010101010101010101010101019385b8391e06d67c3de1675a58cffc3ad16bcf7cc56ab35d7db1fc03fb227a5407b30acd5096cda929351b56e0f90aad4268d89508a45b00b9577fee30241b797b2043d35b2b5ac0d9f71db7845045c4',
  logIndex: 0,
  topics:
  [ '0x20d8a6f5a693f9d1d627a598e8820f7a55ee74c183aa8f1a30e8d4e8dd9a8d84' ],
  transactionHash: '0xd55cbe8179e0d8bed8d8f86cf6832493452be040f67526039b633d87b6dcc030',
  transactionIndex: 0,
  transactionLogIndex: '0x0',
  type: 'mined',
  id: 'log_055ab780'
}];

module.exports = {
  CONFIDENTIAL_GET_PAST_LOGS,
  CONFIDENTIAL_DEPLOY_TX_HASH,
  CONFIDENTIAL_DEPLOY_TX_RECEIPT
}
