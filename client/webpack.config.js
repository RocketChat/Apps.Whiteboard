import path from "path";
import webpack from "webpack";
import CopyPlugin from "copy-webpack-plugin";

const isEnvDevelopment = process.env.NODE_ENV !== "production";
const isEnvProduction = process.env.NODE_ENV === "production";

const DefinePlugin = webpack.DefinePlugin;

export default {
  entry: "./src/main.tsx",
  mode: isEnvDevelopment ? "development" : "production",
  devtool: "inline-source-map",
  output: {
    path: path.resolve(process.cwd(), "dist"),
    filename: "bundle.js",
    clean: true,
  },
  resolve: {
    fallback: {
      crypto: false,
    },
    extensions: [".js", ".jsx", ".ts", ".tsx",".mjs",".cjs"],
  },
  stats: {
    errorDetails: true,
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          // Adds the styles to the DOM by injecting a <style> tag
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: "/.css$/i",
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(js)x?$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public" }],
    }),
    new DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      "process.env.REACT_APP_FIREBASE_CONFIG": JSON.stringify(
        process.env.REACT_APP_FIREBASE_CONFIG || "{}"
      ),
      "process.env.REACT_APP_BACKEND_V2_GET_URL": JSON.stringify(
        process.env.REACT_APP_BACKEND_V2_GET_URL || ""
      ),
      "process.env.REACT_APP_BACKEND_V2_POST_URL": JSON.stringify(
        process.env.REACT_APP_BACKEND_V2_POST_URL || ""
      ),
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ].filter(Boolean),
  devServer: {
    static: {
      directory: path.join(process.cwd(), "public"),
    },
    compress: true,
    hot: true,
    host: "0.0.0.0",
    port: process.env.PORT || 1234,
  },
};
