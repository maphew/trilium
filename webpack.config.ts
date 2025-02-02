import { fileURLToPath } from "url";
import path from "path";
import assetPath from "./src/services/asset_path.js";
import type { Configuration } from "webpack";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const config: Configuration = {
    mode: "production",
    entry: {
        setup: "./src/public/app/setup.js",
        mobile: "./src/public/app/mobile.js",
        desktop: "./src/public/app/desktop.js",
        share: "./src/public/app/share.js"
    },
    output: {
        publicPath: `${assetPath}/app-dist/`,
        path: path.resolve(rootDir, "src/public/app-dist"),
        filename: "[name].js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.join(rootDir, "tsconfig.webpack.json")
                        }
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: {
            ".js": [".js", ".ts"],
            ".cjs": [".cjs", ".cts"],
            ".mjs": [".mjs", ".mts"]
        }
    },
    devtool: "source-map",
    target: "electron-renderer"
};

export default config;