import path from "path";
import webpack from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import miniCssExtractPlugin from "mini-css-extract-plugin";

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
          isEnvDevelopment ? "style-loader" : miniCssExtractPlugin.loader,
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
      // Rule for media files
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset",
        // parser will be used for files that exceed the specified limit (in bytes)
        // asset/inline default otherwise, asset/resource is used
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
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
    isEnvProduction &&
    new miniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }), // this will extract css to a separate file
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
