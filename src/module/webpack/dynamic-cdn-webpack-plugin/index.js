const ResolverFactory = require("enhanced-resolve");

import { resolve } from "path";
import * as fs from "fs";

const ExternalModule = require("webpack/lib/ExternalModule");

import { toPairs, values } from "lodash";

import * as HtmlWebpackPlugin from "html-webpack-plugin";

const getResolver = function getResolver(resolver = "module-to-cdn") {
  if (typeof resolver === "function") {
    return resolver;
  }

  return require("module-to-cdn");
};

const pluginName = "dynamic-cdn-webpack-plugin";
const moduleRegex = /^((?:@[a-z0-9][\w-.]+\/)?[a-z0-9][\w-.]*)/;

const getEnvironment = mode => {
  switch (mode) {
    case "none":
    case "development":
      return "development";

    default:
      return "production";
  }
};

module.exports = class DynamicCdnWebpackPlugin {
  disable;
  env;
  exclude;
  only;
  verbose;
  resolver;
  modulesFromCdn;
  packageJson;

  constructor(options) {
    this.resolver = getResolver();
    this.modulesFromCdn = {};
  }

  getVersion(compiler, moduleName) {
    if (!this.packageJson) {
      const fs = compiler.inputFileSystem;
      const context = compiler.context;
      const content = fs.readFileSync(resolve(context, "package.json"), "utf8");
      this.packageJson = JSON.parse(content.trim());
    }

    const rawVersion = this.packageJson.dependencies[moduleName];
    if (rawVersion) {
      if (rawVersion[0] === "^") {
        return rawVersion.slice(1);
      } else {
        return rawVersion;
      }
    }
  }

  apply(compiler) {
    compiler.resolverFactory.hooks.resolveOptions
      .for("normal")
      .tap(pluginName, resolveOptions => {
        return Object.assign(
          {
            fileSystem: compiler["tempFs"]
          },
          resolveOptions
        );
      });
    compiler.resolverFactory.hooks.resolveOptions
      .for("loader")
      .tap(pluginName, resolveOptions => {
        return Object.assign(
          {
            fileSystem: fs
          },
          resolveOptions
        );
      });
    compiler.resolverFactory.hooks.resolveOptions
      .for("context")
      .tap(pluginName, resolveOptions => {
        return Object.assign(
          {
            fileSystem: compiler["tempFs"]
          },
          resolveOptions
        );
      });

    if (!this.disable) {
      this.execute(compiler, {
        env: this.env || getEnvironment(compiler.options.mode)
      });
    }

    const isUsingHtmlWebpackPlugin =
      HtmlWebpackPlugin != null &&
      compiler.options.plugins.some(x => x instanceof HtmlWebpackPlugin);
    if (isUsingHtmlWebpackPlugin) {
      this.applyHtmlWebpackPlugin(compiler);
    } else {
      this.applyWebpackCore(compiler);
    }
  }

  execute(compiler, { env }) {
    compiler.hooks.normalModuleFactory.tap(pluginName, nmf => {
      nmf.hooks.factory.tap(pluginName, factory => async (data, cb) => {
        const modulePath = data.dependencies[0].request;
        const contextPath = data.context;
        let isModulePath = moduleRegex.test(modulePath);
        if (!isModulePath) {
          return factory(data, cb);
        }
        const varName = await this.addModule(
          compiler,
          contextPath,
          modulePath,
          { env }
        );
        if (varName === false) {
          factory(data, cb);
        } else if (varName == null) {
          cb(null);
        } else {
          cb(null, new ExternalModule(varName, "var", modulePath));
        }
      });
    });
  }

  async addModule(compiler, contextPath, modulePath, { env }) {
    /*   const isModuleExcluded = this.exclude.includes(modulePath) ||
               (this.only && !this.only.includes(modulePath));
           if (isModuleExcluded) {
               return false;
           }*/

    const moduleName = modulePath.match(moduleRegex)[1];
    const isModuleAlreadyLoaded = Boolean(this.modulesFromCdn[modulePath]);
    if (isModuleAlreadyLoaded) {
      return this.modulesFromCdn[modulePath].var;
    }
    const realVersion = this.getVersion(compiler, moduleName);
    let cdnConfig = null;
    if (realVersion) {
      cdnConfig = await this.resolver(modulePath, realVersion, { env });
    }

    if (cdnConfig == null) {
      if (this.verbose) {
        console.error(
          `❌ '${modulePath}' couldn't be found, please add it to https://github.com/mastilver/module-to-cdn/blob/master/modules.json`
        );
      }
      return false;
    }

    if (this.verbose) {
      console.error(
        `✔️ '${cdnConfig.name}' will be served by ${cdnConfig.url}`
      );
    }

    this.modulesFromCdn[modulePath] = cdnConfig;

    return cdnConfig.var;
  }

  applyWebpackCore(compiler) {
    compiler.hooks.afterCompile.tapAsync(pluginName, (compilation, cb) => {
      for (const [name, cdnConfig] of toPairs(this.modulesFromCdn)) {
        compilation.addChunkInGroup(name);
        const chunk = compilation.addChunk(name);
        chunk.files.push(cdnConfig.url);
      }
      cb();
    });
  }

  applyHtmlWebpackPlugin(compiler) {
    compiler.hooks.compilation.tap(pluginName, compilation => {
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tap(
        pluginName,
        data => {
          if (!(data === undefined)) {
            const assets = Object.values(this.modulesFromCdn).map(
              moduleFromCdn => moduleFromCdn.url
            );
            data.assets.js = assets.concat(data.assets.js);
          }
        }
      );
    });
  }
};
