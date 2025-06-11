const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: "./src/main/main.ts",
  target: "electron-main",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist/main"),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
