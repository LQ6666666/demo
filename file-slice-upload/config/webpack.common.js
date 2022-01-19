const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, "../src/index.ts"),
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "../build"),
        // hashFunction: "xxhash64"
    },
    mode: "development",
    module: {
        rules: [
            // {
            //     test: /\.ts$/,
            //     exclude: /node_modules/,
            //     loader: "babel-loader",
            // },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: "esbuild-loader",
                options: {
                    loader: "ts",
                    target: "es2015"
                }
            }
        ]
    },
    optimization: {
        usedExports: true,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                // esbuild 是一款非常快速的 JavaScript 打包工具和压缩工具
                minify: TerserPlugin.esbuildMinify,
                // 启用/禁用多进程并发运行功能
                parallel: true,
                // 启用/禁用剥离注释功能
                extractComments: false,
            })
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "../public/index.html"),
        }),
    ],
}