const path = require('path')

module.exports = {
    devtool: 'hidden-source-map', // eval() doesn't work in CF's workers
    entry: './lib/fileCore.ts',
    mode: process.env.NODE_ENV || 'development',
    module: {
        rules: [
            {
                loader: 'ts-loader',
                exclude: [/node_modules/, /cli/, /worker/],
                options: { configFile: 'lib.tsconfig.json' },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'lib.js',
        path: path.resolve(__dirname, 'dist'),
    },
}
