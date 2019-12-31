import { WebpackService } from "../webpack/webpack.service";
import { GenerateConfig } from "../webpack/webpack-option-generate";
import { Inject, Service } from "typedi";
import { CompilerStore, DevComplierStoreService } from "./dev-store.service";

import v4 = require("uuid/v4");
import * as webpack from "webpack";

import { resolve } from "path";

import MemoryFS = require("memory-fs");

import { Container } from "typedi";

import * as WebpackDevMddleware from "webpack-dev-middleware";
import * as webpackHotMiddleware from "webpack-hot-middleware";

import * as express from "express";
import { Server } from "../../main";

@Service()
export class DevServerService {
  @Inject()
  storeService: DevComplierStoreService;
  @Inject()
  webpackService: WebpackService;

  constructor() {}

  create(files, config?: GenerateConfig) {
    const self = this;
    const id = v4().toString();
    let url = "/dev/" + id + "/";
    const {
      compiler,
      inputFileSystem,
      outputFileSystem
    } = this.webpackService.compiler(id, files, config);
    let devInstance = WebpackDevMddleware(compiler);
    devInstance.fileSystem = compiler.outputFileSystem as any;
    let hotInstance = webpackHotMiddleware(compiler, {
      log: false,
      path: "/__webpack_hmr",
      name: id,
      reload: true,
      heartbeat: 300,
      autoConnect: false
    });

    let server = Container.get("dev-server") as Server;

    let app = server!.app as express.Application;

    app.use(url, devInstance);
    app.use(url, hotInstance);
    return new Promise(function(resolve, reject) {
      let instance = {
        id,
        compiler,
        inputFileSystem,
        outputFileSystem,
        devInstance,
        hotInstance
      };
      devInstance.waitUntilValid((state: webpack.Stats) => {
        if (state.hasErrors()) {
          reject({ state, instance });
        } else {
          self.storeService.add(instance);
          resolve({ state, instance });
        }
      });
    });
  }

  updateFiles(storeId, files) {
    let self = this;
    return new Promise(function(proResolve, reject) {
      let instance = self.storeService.get(storeId) as CompilerStore;
      let {
        id,
        compiler,
        inputFileSystem,
        outputFileSystem,
        devInstance,
        hotInstance
      } = instance;
      const myfs = inputFileSystem;
      let keys = Object.keys(files);
      keys.forEach(key => {
        if (id && typeof key === "string") {
          console.log(key);
          let filePath = resolve(id, key);
          if (files[key] === "") {
            files[key] = " ";
          }
          myfs.writeFileSync(filePath, files[key], "utf8");
        }
      });
      /*   hotInstance.publish('test');*/
      devInstance.invalidate();
      self.storeService.update(id, instance);
      devInstance.waitUntilValid((state: webpack.Stats) => {
        if (state.hasErrors()) {
          reject({ state, instance });
        } else {
          proResolve({ state, instance: true });
        }
      });
    });
  }

  hotTest(storeId, color) {
    let {
      id,
      compiler,
      inputFileSystem,
      outputFileSystem,
      devInstance,
      hotInstance
    } = this.storeService.get(storeId) as CompilerStore;
    const myfs = inputFileSystem;
    let filePath = resolve(id, "my-element.css");
    console.log(filePath);
    let code = `.App {
    font-family: sans-serif;
    text-align: center;
    background-color: ${color}
}
`;

    myfs.writeFileSync(filePath, code, "utf8");

    hotInstance.publish("update");
    devInstance.invalidate();
    return myfs.readFileSync(filePath, "utf8");
  }
}
