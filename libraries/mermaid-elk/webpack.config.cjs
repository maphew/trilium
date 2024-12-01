const path = require("path");
const webpack = require("webpack");

module.exports = {
    mode: "production",
    entry: "../../node_modules/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs",
    output: {
        library: "MERMAID_ELK",
        filename: "elk.min.js",
        path: path.resolve(__dirname),
        libraryTarget: "umd",
        libraryExport: "default"
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ]
}