import { fileURLToPath } from "url";
import path from "path";
import assetPath from "./src/services/asset_path.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
export default {
    mode: 'production',
    entry: {
        setup: './src/public/app/setup.js',
        mobile: './src/public/app/mobile.js',
        desktop: './src/public/app/desktop.js',
    },
    output: {
        publicPath: `${assetPath}/app-dist/`,
        path: path.resolve(rootDir, 'src/public/app-dist'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        extensionAlias: {
            '.js': ['.ts', '.js'],
        }
    },
    module: {
        rules: [
            {
                test: /\.[jt]s$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.prod.json',
                        allowTsInNodeModules: true,
                        compilerOptions: {
                            sourceMap: true
                        }
                    }
                },
                exclude: /node_modules/,
            }
        ]
    },
    devtool: 'source-map',
    target: 'electron-renderer',
};
