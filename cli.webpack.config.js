const path = require('path');

module.exports = {
    devtool: 'hidden-source-map',
    target: 'node',
    entry: './lib/cli.ts',
    mode: process.env.NODE_ENV || 'development',
    module: {
        rules: [
            {
                use: 'ts-loader',
                exclude: [/node_modules/, /worker/],
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js' ]
    },
    output: {
        filename: 'cli.js',
        path: path.resolve(__dirname, 'dist')
    }
};
