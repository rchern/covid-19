const path = require("path");
const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const config = merge(common, {
  mode: "development",
  devtool: "cheap-module-source-map",
  output: {
    filename: "scripts/[name].js",
  },
  devServer: {
    open: true,
    contentBase: path.resolve(__dirname, "../src")
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
  ]
});

module.exports = config;
