import { Service } from "typedi";
import * as _ from "lodash";
import * as webpack from "webpack";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";

import { assign } from "lodash";
import * as moment from "moment";

@Service()
export class DevComplierStoreService {
  private COMPLIER_STORE: { [key: string]: CompilerStore } = {};
  private timer = 1000 * 60 * 5;
  constructor() {
    this.timingClear();
  }
  get(id) {
    return this.COMPLIER_STORE[id];
  }
  add(instance) {
    let createTime = moment().format("YYYY-MM-DD HH:mm:SS");
    this.COMPLIER_STORE[instance.id] = assign(instance, {
      createTime,
      lastUpdateTime: createTime
    });
    return this.COMPLIER_STORE[instance.id];
  }
  update(id, instance) {
    let lastUpdateTime = moment().format("YYYY-MM-DD HH:mm:SS");
    let oldInstance = this.COMPLIER_STORE[id];
    oldInstance.lastUpdateTime = lastUpdateTime;
    this.COMPLIER_STORE[id] = _.assign(instance, oldInstance);
    return id;
  }
  delete(id) {
    delete this.COMPLIER_STORE[id];
  }
  timingClear() {
    let self = this;
    setInterval(function() {
      let keys = Object.keys(self.COMPLIER_STORE);
      keys.forEach(key => {
        let store = self.COMPLIER_STORE[key] as CompilerStore;
        let now = (moment() as moment.Moment).format("x");
        let last = (moment(store.lastUpdateTime) as moment.Moment).format("x");
        let temp = parseInt(now) - parseInt(last);
        if (temp > self.timer) {
          self.delete(store.id);
        }
      });
    }, 1000 * 60);
  }
}
export interface CompilerStore {
  id: string;
  compiler: webpack.Compiler;
  inputFileSystem: any;
  outputFileSystem: any;
  devInstance: WebpackDevMiddleware.WebpackDevMiddleware;
  hotInstance: WebpackHotMiddleware.EventStream;
  createTime: string;
  lastUpdateTime: string;
}
