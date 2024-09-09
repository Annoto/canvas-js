const path = require('path');
const webpack = require('webpack');
const packageData = require('./package.json');

module.exports = function (env) {
    console.log(env);
    return {
        entry: {
            bootstrap: './src/bootstrap.ts',
            main: './src/main.ts',
        },
        target: 'web',
        output: {
            filename: 'annoto-[name].js',
            path: path.resolve(__dirname, 'dist/'),
            library: ['AnnotoCanvasBootstrap', 'AnnotoCanvas'],
            libraryTarget: 'umd',
            sourceMapFilename: 'annoto-[name].map',
            clean: true,
            publicPath: env.publicPath ?? 'auto',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.json',
                    },
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    version: JSON.stringify(packageData.version),
                    ENV: JSON.stringify(env.envName),
                    name: JSON.stringify(packageData.name),
                    publicPath: JSON.stringify(env.publicPath),
                },
            }),
        ],
    };
};
