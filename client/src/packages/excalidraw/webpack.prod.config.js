const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const autoprefixer = require("autoprefixer");
const webpack = require("webpack");
const { parseEnvVariables } = require("./env");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: {
    "excalidraw.production.min": "./entry.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    library: "ExcalidrawLib",
    libraryTarget: "umd",
    filename: "[name].js",
    chunkFilename: "excalidraw-assets/[name]-[contenthash].js",
    assetModuleFilename: "excalidraw-assets/[name][ext]",
    publicPath: "",
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".css", ".scss"],
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /node_modules/,
        use: [
          MiniCssExtractPlugin.loader,
          //mini-css-extract-plugin extracts CSS into separate files. It creates a CSS file per JS file which contains CSS.
          //smaller bundle size
          {
            loader: "css-loader",
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [autoprefixer()],
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(ts|tsx|js|jsx|mjs)$/,
        exclude: /node_modules\/(?!browser-fs-access)/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, "../tsconfig.prod.json"),
            },
          },
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                ["@babel/preset-react", { runtime: "automatic" }],
                "@babel/preset-typescript",
              ],
              plugins: [
                "transform-class-properties",
                "@babel/plugin-transform-runtime",
              ],
            },
          },
        ],
      },
      // Rule for PNG, JPEG, and other media files
      {
        test: /\.(png|jpe?g|gif|svg|ico|webp)$/i,
        type: "asset",
        // the parser object allows you to specify 8kb as the maximum size
        // if the file is greater than 8kb, it will emit a separate file(asset/resourse) else it will be inlined(asset/inline)
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.js($|\?)/i,
      }),
    ],
    splitChunks: {
      chunks: "async",
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
        },
      },
    },
  },
  plugins: [
    ...(process.env.ANALYZER === "true" ? [new BundleAnalyzerPlugin()] : []),
    new webpack.DefinePlugin({
      "process.env": parseEnvVariables(
        path.resolve(__dirname, "../../../.env.production"),
      ),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "excalidraw-assets/[name]-[contenthash].css",
    }),
  ],
  externals: {
    react: {
      root: "React",
      commonjs2: "react",
      commonjs: "react",
      amd: "react",
    },
    "react-dom": {
      root: "ReactDOM",
      commonjs2: "react-dom",
      commonjs: "react-dom",
      amd: "react-dom",
    },
  },
};
