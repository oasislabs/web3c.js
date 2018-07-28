const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: "development",
    module: {
        rules: [
            {
                test: /.*\.js$/,
                include: [
                 path.resolve(__dirname, "crypto"),
                 path.resolve(__dirname, "web3p"),
                 path.resolve(__dirname, "test")
                ],
                exclude: [
                 path.resolve(__dirname, "node_modules")
                ],
                loader: "babel-loader"
            }
        ]
    },
    entry: './index',
    resolve: {
        modules: [
           "node_modules",
           path.resolve(__dirname, "crypto"),
           path.resolve(__dirname, "web3p")
        ],
        extensions: [ '.js' ],
        alias: {
          "../crypto/node": "../crypto/subtle",
          "./crypto/node": "./crypto/subtle"
        }
    },
    output: {
        path: __dirname + '/output',
        filename: 'web3p.js'
    },
    devtool: "source-map",
    target: "web"
};
