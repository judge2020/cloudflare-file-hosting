const path = require('path');

module.exports = {
    devtool: 'hidden-source-map',
    target: 'node',
    entry: './cli/cli.ts',
    mode: process.env.NODE_ENV || 'development',
    module: {
        rules: [
            {
                loader: 'ts-loader',
                exclude: [/node_modules/, /worker/, /lib/],
                options: { configFile: 'cli.tsconfig.json' },
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
