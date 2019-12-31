import { resolve, basename } from "path";

const HtmlWebpackPlugin = require("html-webpack-plugin");
import { CleanWebpackPlugin } from "clean-webpack-plugin";

const DynamicCdnWebpackPlugin = require("./dynamic-cdn-webpack-plugin/index");

import * as webpack from "webpack";
import { VueLoaderPlugin } from "vue-loader";

const WebpackProgressBar = require("webpack-progress-bar");

export interface Files {
  [path: string]: string;
}

export const getDefaultOptions = (context, config?: GenerateConfig) => {
  let inputPath = "main.js";
  let entry = {};
  let rules = [
    Rules.babel,
    Rules.ts,
    Rules.html,
    Rules.css,
    Rules.img,
    Rules.font,
    Rules.vue
  ];

  let plugins = [
    new webpack.HotModuleReplacementPlugin(),
    new CleanWebpackPlugin(),
    new webpack.ProvidePlugin({
      join: ["lodash", "join"]
    }),
    new webpack.NamedModulesPlugin(),
    new VueLoaderPlugin()
  ];
  if (config) {
    if (config.inputPath) {
      inputPath = config.inputPath;
      entry = { main: resolve(context, basename(inputPath)) };
    }
    plugins.push(new DynamicCdnWebpackPlugin());
    if (config.entry) {
      const keys = Object.keys(config.entry);
      let commonsRangeList = [];
      keys.forEach(key => {
        commonsRangeList.push(key);
        entry[key] = [
          resolve(context, config.entry[key]),
          "editor-client/hmr-client.js"
        ];
      });
    } else {
      if (config.inputPath) {
        entry = { index: resolve(context, config.inputPath) };
      } else {
        entry = { index: resolve(context, "main.ts") };
      }
    }
    if (config.htmlPath) {
      let url: string =
        resolve(context, config.htmlPath) || resolve(context, "index.js.html");
      let htmlPlugin;
      htmlPlugin = new HtmlWebpackPlugin({
        // 打包输出HTML
        title: "Hello World app",
        filename: "index.html",
        template: url
      });

      if (htmlPlugin) {
        plugins.push(htmlPlugin);
      }
    }
  }

  let optimization = {
    minimize: false,
    noEmitOnErrors: true,
    namedModules: true,
    splitChunks: {
      chunks: "async",
      minSize: 30000,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 6,
      maxInitialRequests: 4,
      automaticNameDelimiter: "~",
      automaticNameMaxLength: 30,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          test: /[\\/]src[\\/]/,
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  };

  return {
    mode: "production",
    context: resolve(context),
    devtool: "inline-source-map",
    entry,
    plugins,
    optimization,
    output: {
      filename: "[name].bundle.js",
      path: resolve(context, "dist")
    },
    module: {
      rules
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx", ".vue", ".css", ".scss"]
    }
  };
};
export const setTsConfigPath = (options, path) => {
  options.module.rules.forEach(item => {
    if (item.loader === "ts-loader") {
      if (item.options) {
        Object.assign(item.options, { configFile: path });
      }
    }
  });
  return options;
};

export interface GenerateConfig {
  inputPath?: string;
  htmlPath?: string;
  entry?: { [name: string]: string };
}

export const Rules = {
  babel: {
    test: /.(js|jsx)$/,
    exclude: /(node_modules|bower_components)/,
    use: [
      {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react"]
        }
      }
    ]
  },
  ts: {
    test: /\.(ts)$/,
    use: [
      {
        loader: "ts-loader",
        options: {
          configFile:
            "E:/Users/JongWong/Source/Repos/editor/mock-server/src/module/webpack/tsconfig.json"
        }
      }
    ]
  },
  css: {
    test: /.(css)$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }]
  },
  html: {
    test: /.(html)$/,
    use: ["html-loader"]
  },
  img: {
    test: /.(png|svg|jpg|gif)$/,
    use: ["file-loader"]
  },
  font: {
    test: /.(woff|woff2|eot|ttf|otf)$/,
    use: ["file-loader"]
  },
  vue: {
    test: /\.vue$/,
    use: ["vue-loader"]
  }
};
