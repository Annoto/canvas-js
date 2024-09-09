const { merge } = require('webpack-merge');
const CommonConfig = require('./webpack.common');
const packageData = require('./package.json');

module.exports = function (env) {
    const commonEnv = env;
    commonEnv.publicPath = `https://cdn.annoto.net/canvas-js/${env.version ? packageData.version : 'latest'}/`;
    return merge(CommonConfig(commonEnv), {
        devtool: 'nosources-source-map',
        mode: 'production',
        optimization: {
            splitChunks: {
                chunks: 'all',
                minSize: 100000,
            },
        },
    });
};
