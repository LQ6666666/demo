const path = require("path");

const DonePlugin = require("./plugins/done-plugin");
const RunPlugin = require("./plugins/run-plugin");
const ReadMePlugin = require("./plugins/readme-plugin");

module.exports = {
  mode: "development",
  // 跟目录 current working directory
  // context: process.cwd(),
  entry: {
    page1: path.resolve(__dirname, "./src/page1.js"),
    page2: path.resolve(__dirname, "./src/page2.js")
  },
  // entry: path.resolve(__dirname, "./src/index.js"),
  // entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "./build"),
    // filename: "main.js",
    filename: "[name].js"
  },
  resolve: {
    extensions: [".js", ".jsx", "json"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          path.resolve(__dirname, "loaders", "logger1-loader.js"),
          path.resolve(__dirname, "loaders", "logger2-loader.js")
        ]
      }
    ]
  },
  plugins: [new RunPlugin(), new ReadMePlugin(), new DonePlugin()],
};
