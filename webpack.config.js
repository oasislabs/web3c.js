const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = env => {
  let config = {
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
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-transform-regenerator']
            }
          }
        }
      ]
    },
    entry: ['@babel/polyfill', './index.browser'],
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, 'crypto'),
        path.resolve(__dirname, 'web3c')
      ],
      extensions: ['.js'],
      alias: {
        '../crypto/node': '../crypto/subtle',
        './crypto/node': './crypto/subtle',
      }
    },
    output: {
      path: path.join(__dirname, 'output'),
      filename: 'web3c.js',
      chunkFilename: '[name].js',
    },
    plugins: [
      new CopyWebpackPlugin([{ from: 'demo/', to: './' }])
    ],
    devtool: 'source-map',
    target: 'web'
  };
  if (env.mode == 'development') {
    delete config['plugins'];
  }
  return config;
};
