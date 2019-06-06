const path = require('path');

module.exports = {
    target: 'node',
    entry: './lib/cli.ts',
    //mode: 'development',
    mode: 'production',
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
