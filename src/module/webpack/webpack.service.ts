import MemoryFS = require("memory-fs");

import * as webpack from "webpack";
import {
  Files,
  GenerateConfig,
  getDefaultOptions
} from "./webpack-option-generate";
import { Service } from "typedi";
import { filesToFs, clonefsToMfs } from "../../utils";
import * as fs from "fs";
import { resolve } from "path";
import { cloneDeep } from "lodash";

@Service()
export class WebpackService {
  mfs;
  constructor() {
    this.mfs = new MemoryFS();
    this.copyFile(fs, this.mfs);
  }
  copyFile(fs1, fs2) {
    let dirList = [
      "node_modules/css-loader",
      "node_modules/style-loader",

      "node_modules/vue-loader",
      "node_modules/vue-hot-reload-api",

      {
        origin: "src/module/editor-client",
        target: "node_modules/editor-client/"
      },

      "node_modules/webpack-hot-middleware",
      "node_modules/webpack/buildin/module.js",
      "node_modules/ansi-html",
      "node_modules/html-entities",
      "node_modules/strip-ansi",
      "node_modules/ansi-regex",
      "node_modules/querystring"
    ] as Array<string | { origin: string; target: string }>;
    dirList.forEach(async item => {
      if (typeof item === "string") {
        let origin = resolve(item);
        await clonefsToMfs(fs1, fs2, origin);
      } else {
        let origin = resolve(item.origin);
        let target = resolve(item.target);
        await clonefsToMfs(fs1, fs2, origin, target);
      }
    });
    return fs2;
  }
  compiler(id, files: Files, config?: GenerateConfig, ismfs?: boolean) {
    let mfs = this.mfs;
    let options = getDefaultOptions(id, config) as webpack.Configuration;
    filesToFs(options.context, files, this.mfs);
    let compiler = webpack(options);
    compiler["tempFs"] = mfs;
    compiler.inputFileSystem = mfs;
    compiler.outputFileSystem = mfs;
    return { compiler, inputFileSystem: mfs, outputFileSystem: mfs };
  }
}
