const path = require('path');

module.exports = {
    devtool: 'hidden-source-map', // eval() doesn't work in CF's workers
    entry: './worker/workerCode.ts',
    target: 'webworker',
    mode: process.env.NODE_ENV || 'development',
    module: {
        rules: [
            {
                loader: 'ts-loader',
                exclude: [/node_modules/, /cli/],
                options: { configFile: 'worker.tsconfig.json' },
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js' ]
    },
    output: {
        filename: 'worker.js',
        path: path.resolve(__dirname, 'dist')
    }
};
