const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackMd5Hash = require("webpack-md5-hash");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const config = merge(common, {
  mode: "production",
  devtool: "source-map",
  output: {
    filename: "scripts/[name].[chunkhash].js",
    publicPath: "/covid-19/"
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "styles/[name].[contenthash].css"
    }),
    new WebpackMd5Hash(),
    new CopyWebpackPlugin([
      {
        from: '**/*.json', to: './[path][name].[ext]', context: "./src/"
      },
    ]),
  ],
  optimization: {
    runtimeChunk: true
  }
});

module.exports = config;
