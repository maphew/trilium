const path = require('path');
const assetPath = require('./src/services/asset_path.js');

// Debug information for path resolution
console.log('=== Webpack Configuration Debug ===');
console.log('Project Root:', __dirname);
console.log('Asset Path:', assetPath);
console.log('Output Path:', path.resolve(__dirname, 'src/public/app-dist'));
console.log('Node Process CWD:', process.cwd());

const config = {
    mode: 'production',
    entry: {
        setup: './src/public/app/setup.js',
        mobile: './src/public/app/mobile.js',
        desktop: './src/public/app/desktop.js',
    },
    output: {
        publicPath: `${assetPath}/app-dist/`,
        path: path.resolve(__dirname, 'src/public/app-dist'),
        filename: '[name].js',
    },
    devtool: 'source-map',
    target: 'electron-renderer',
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        // Add debug logging for module resolution
        plugins: [
            {
                apply(resolver: import('webpack').Resolver) {
                    resolver.hooks.resolved.tap('PathDebug', (result: { request: string; path: string }) => {
                        console.log('Resolved:', result.request, '=>', result.path);
                    });
                }
            }
        ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.webpack.json'
                        }
                    }
                ],
                exclude: /node_modules/
            }
        ]
    }
};

module.exports = config;
