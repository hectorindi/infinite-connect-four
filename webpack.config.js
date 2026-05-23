const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin"); // 1. Import this

module.exports = {
  entry: './Source/src/main.ts',
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
      { 
        test: /\.css$/i, 
        use: ["style-loader", "css-loader"] // 2. This fixes the MIME type error
      },
    ],
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './Source/index.html' }),
    new CopyPlugin({
      patterns: [
        { from: "Source/assets", to: "assets" }, // 3. Moves your images to dist
        { from: "Source/styles", to: "styles" }  // 4. Moves your CSS to dist
      ],
    }),
  ]
};