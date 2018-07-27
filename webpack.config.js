const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: "production",
    module: {
        rules: [
            {
                test: /.*\.js$/,
                include: [
                 path.resolve(__dirname, "crypto"),
                 path.resolve(__dirname, "web3p")
                ],
                exclude: [
                 path.resolve(__dirname, "node_modules")
                ],
                loader: "babel-loader"
            }
        ]
    },
    entry: './',
    resolve: {
        modules: [
          "node_modules",
           path.resolve(__dirname, "crypto"),
           path.resolve(__dirname, "web3p")
        ],
        extensions: [ '.js' ]
    },
    output: {
        path: __dirname + '/output',
        filename: 'web3p.js'
    },
    devtool: "source-map",
    target: "web"
};
