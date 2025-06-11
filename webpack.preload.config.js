const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: "./src/preload/preload.ts",
  target: "electron-preload",
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
    filename: "preload.js",
    path: path.resolve(__dirname, "dist/preload"),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
