const path = require("path");
module.exports = function(env) {
  const config = {
    entry: {
      client: "./src/module/webpack/webpack-hot-middleware/hmr-client.js"
      /* "./src/pm2/test": "./src/pm2/test.ts",*/
      /* "./src/module/webpack/dynamic-cdn-webpack-plugin": "./src/module/webpack/dynamic-cdn-webpack-plugin/index.js",*/
    },
    output: {
      path: path.resolve("./src/module/webpack/webpack-hot-middleware"),
      filename: "[name].min.js"
    },
    target: "web",
    mode: env.NODE_ENV,
    watch: env.NODE_ENV == "development",
    devtool: env.NODE_ENV == "development" ? "inline-source-map" : undefined,
    externals: {},
    /* minify: false,*/
    resolve: {
      extensions: [".ts", ".js"]
    },
    module: {
      rules: [
        {
          test: /.(js|jsx)$/,
          exclude: /(node_modules|bower_components)/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: ["@babel/preset-env"]
              }
            }
          ]
        },
        {
          test: /\.tsx?$/,
          exclude: /(node_modules|bower_components)/,
          use: [
            {
              loader: "ts-loader"
            }
          ]
        },
        {
          test: /\.css$/,
          use: ["vue-style-loader", "css-loader"]
        }
      ]
    },
    plugins: []
  };
  return config;
};
