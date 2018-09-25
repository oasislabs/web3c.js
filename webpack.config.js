const path = require('path');

module.exports = {
  mode: 'production',
  module: {
    rules: [
      {
        test: /.*\.js$/,
        include: [
          path.resolve(__dirname, 'crypto'),
          path.resolve(__dirname, 'web3c'),
          path.resolve(__dirname, 'test')
        ],
        exclude: [
          path.resolve(__dirname, 'node_modules')
        ],
        use: [
          'babel-loader',
          'webpack-strip-block',
        ]
      }
    ]
  },
  entry: './index',
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'crypto'),
      path.resolve(__dirname, 'web3c')
    ],
    extensions: [ '.js' ],
    alias: {
      '../crypto/node': '../crypto/subtle',
      './crypto/node': './crypto/subtle'
    }
  },
  output: {
    path: __dirname + '/output',
    filename: 'web3c.js'
  },
  devtool: 'source-map',
  target: 'web'
};
