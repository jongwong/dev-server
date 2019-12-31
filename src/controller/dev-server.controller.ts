import {
  Body,
  Controller,
  Get,
  Param,
  Params,
  Post,
  Req,
  Res,
  UseBefore
} from "routing-controllers";
import { Inject } from "typedi";
import { DevServerService } from "../module/dev-server/dev-server.service";
import { Files } from "../module/webpack/webpack-option-generate";

import { Response } from "express";
import { DevMiddleware } from "../module/dev-server/dev-middleware";
import * as path from "path";
import { fsToKeyFile } from "../utils";
import * as fs from "fs";

@Controller()
export class DevServerController {
  @Inject()
  devServer: DevServerService;

  constructor() {}

  @Get("/run")
  async compiler(@Res() res: Response) {
    let url = path.resolve("./demoCode");
    let files = (await fsToKeyFile(fs, url)) as Files;

    res.setHeader("Content-Type", "application/json;charset=utf-8");

    const config = {
      htmlPath: "./src/index.html",
      entry: { index: "./src/index.js" }
    };

    const self = this;
    return new Promise(function(resolve, reject) {
      self.devServer.create(files, config).then(
        ({ state, instance }) => {
          resolve({ id: instance.id });
        },
        ({ error, instance }) => {
          console.log(error);
          reject("编译出错");
        }
      );
    });
  }

  @Post("/run")
  async run(@Res() res: Response, @Body() body) {
    const self = this;
    return new Promise(function(resolve, reject) {
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      let files = {};
      if (!body.files) {
        reject("files 格式错误");
      }
      if (!body.options) {
        reject("options 格式错误");
      }

      try {
        self.devServer.create(body.files, body.options).then(
          ({ state, instance }) => {
            resolve({ id: instance.id });
          },
          ({ error, instance }) => {
            console.log(error);
            reject("编译出错");
          }
        );
      } catch (e) {
        reject(e.message);
      }
    });
  }

  @Post("/files/:id")
  async updateFiles(
    @Param("id") id: string,
    @Body() body: { id: string; files: any }
  ) {
    const self = this;
    return new Promise(function(resolve, reject) {
      if (id && body.files) {
        console.log(id);
        return self.devServer
          .updateFiles(id, body.files)
          .then(({ state, instance }) => {
            resolve({ text: instance });
          })
          .catch(data => {});
      } else {
        reject("id | files error");
      }
    });
  }

  @Get("/hotTest/:id/:color")
  hotTest(@Param("id") id: string, @Param("color") color: string) {
    return this.devServer.hotTest(id, color);
  }
}
