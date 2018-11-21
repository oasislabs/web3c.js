// ''import' and 'export' may only appear at the top level', which means a separate
// required file is needed when they are only used conditionally.
module.exports = import(/* webpackChunkName: 'web3', webpackMode: 'lazy' */ 'web3');
