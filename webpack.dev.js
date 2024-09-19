const path = require('path');
const { merge } = require('webpack-merge');
const CommonConfig = require('./webpack.common');

module.exports = function (env) {
    const commonEnv = env;
    commonEnv.publicPath = env.proxy ? 'https://canvas-js-annoto.eu.ngrok.io/' : 'http://localhost:9003/';
    return merge(CommonConfig(commonEnv), {
        devtool: 'inline-cheap-module-source-map',
        mode: 'development',
        devServer: {
            port: 9004,
            allowedHosts: 'all',
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            hot: false,
        },
    });
};
