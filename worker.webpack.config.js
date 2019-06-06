const path = require('path');

module.exports = {
    entry: './worker/workerCode.ts',
    //mode: 'development',
    mode: 'production',
    module: {
        rules: [
            {
                use: 'ts-loader',
                exclude: [/node_modules/, /lib/],
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
