process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err);
    //打印出错误的调用栈方便调试
    console.log(err.stack)
});

import {ResolverFactory} from "enhanced-resolve";
import {cloneDeep} from 'lodash'
import * as express from "express";
import {Container} from "typedi";
import "reflect-metadata";

import {Files, GenerateConfig, getDefaultOptions, setFiles} from "../module/webpack/webpack-option-generate";
import * as webpack from "webpack";
import {resolve, basename, join, dirname} from "path";

import * as fs from 'fs-extra';





import * as WebpackDevMddleware from 'webpack-dev-middleware'

import {v4} from 'uuid'
import * as bodyParser from 'body-parser';

import {error} from "util";
const config = {
    "htmlPath": "./index.html",
    "entry":{"index":"./index.js"}
};



export const testFiles = {
    'index.js': `import React, { Component } from 'react';
import { render } from 'react-dom';

import * as _ from "lodash"

import $ from "jquery";

export const Hello = ({ name }) => <h1>Hello {name}!</h1>;

class App extends Component {
  constructor() {
    super();
    this.state = {
      name: 'React'
    };

           $('#id')

  }


  render() {
    return (
      <div>
        <Hello name={this.state.name} />
        <p>
          Start editing to see some magic happen :)
        </p>
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));`,
    'index.html':`<div id="root"></div>`,
    'webpack.config.js':`
    module.exports = {
            mode: 'production',
            devtool: 'inline-source-map',
            entry: {index: resolve(basePath, 'test.ts')},
            plugins: [
                new HtmlWebpackPlugin({template: resolve(basePath, 'test.ts.html')}),
                new webpack.ProvidePlugin({
                    join: ['lodash', 'join']
                }),

    // fgfdgdg
    /* test */
            ],
            output: {
                filename: '[name].bundle.js',
                path: resolve(outputPath, 'dist')
            },
            module: {
                rules: [
                    {
                        test: /\.(js|jsx)$/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['es2015']
                        }
                    },
                    {
                        test: /\.(html)$/,
                        loader: 'html-loader'
                    },
                    {
                        test: /\.css$/,
                        use: [
                            'style-loader',
                            'css-loader'
                        ]
                    },
                    {
                        test: /\.(png|svg|jpg|gif)$/,
                        use: [
                            'file-loader'
                        ]
                    },
                    {
                        test: /\.(woff|woff2|eot|ttf|otf)$/,
                        use: [
                            'file-loader'
                        ]
                    }
                    
                    /* {
                               // test     test: /\.js$/,
                                    loader: 'eslint-loader',
                                    enforce: 'pre',
                                    include: [resolve(__dirname, 'src')]
                                } */

                ]
            }
        }; 
            // fgfdgdg
    /* test */`,
    'package.json':`{
    "name": "test",
    "version": "3.0.0",
    "license": "MIT",
    "author": {
        "name": "JongWong",
        "email": "jongWong@aliyuncom"
    },
    "scripts": {
    },
    "dependencies": {
    "react": "^16.9.0",
    "react-dom": "^16.9.0",
    "lodash": "^4.17.15",
    "jquery":"^3.4.1"
    },
    "devDependencies": {
    }
}`};



const MemoryFS = require("memory-fs");
const mfs = new MemoryFS();



let store = {};
const compiler = function(basePath,files: Files,config?: GenerateConfig, ismfs?:boolean) {


    let webpackOptions;
    webpackOptions = getDefaultOptions(basePath,config);
    webpackOptions = setFiles(webpackOptions,files, mfs);

    let compiler = webpack(webpackOptions);
    var webpackHotMiddleware = require("webpack-hot-middleware");
    compiler['tempFs'] = mfs;
    compiler.inputFileSystem = mfs;
    compiler.outputFileSystem = mfs;
    console.log(compiler.options.plugins);
    let devInstance =  WebpackDevMddleware(compiler);
    let hotInstance =  webpackHotMiddleware(compiler);
    store[basePath] = {compiler,devInstance,hotInstance};


    return new Promise(function(resolve, reject) {
        devInstance.waitUntilValid((state:webpack.Stats) => {
            if(state.hasErrors()) {
                reject(state)
            } else {
                resolve(state)
            }
        });
    });
};

class Server {

    public app: express.Application;

    public static bootstrap(): Server {
        return new Server();
    }

    constructor() {
        this.app = express();
        this.config();
    }

    private config() {
        this.app.use(function (req,res,next) {
            /*console.log(req.originalUrl);*/

            next()
        });
        this.app.use(bodyParser.json());
        var self = this;
        this.app.get('/test/:id',function (req, res) {
            let id =  req.params.id;
            var URL = resolve(id,'index.js.ts.html');
            var content = mfs.readFileSync(URL,'utf8');
            console.log(content);
            content = content.replace('<div id="root"></div>','<div id="root"></div><div >123456789</div>');
            mfs.writeFileSync(URL,content,'utf8');
            res.send(content)

        });
        this.app.get('/run',function (req, res) {
            let files = testFiles as Files;
            let id = v4().toString();
            try {

                compiler(id,files,config).then((status) => {
                    var {compiler,devInstance,hotInstance} = store[id]
                    self.app.use('/dev/'+id +'/',devInstance);
                    self.app.use('/dev/'+ id +'/',hotInstance);
                    res.send({id:id})
                },(error) => {
                    console.log(error);

                    res.send('编译出错')
                });
            }catch (e) {
                console.log(e);
                res.send('编译出错')
            }


        });
        this.app.post('/server',function (req, res) {

            let options = req.body;
            let packConfig;
            let files;
            if(options.packConfig){
               packConfig = options.packConfig;
            }
            if(options.files) {
                files = options.files as Files;
            }
            if(packConfig && files) {
                let id = v4().toString();

                compiler(id,files,config).then((status) => {

                    res.send({id:id})
                },(error) => {
                    res.send('编译出错')
                });
            }
        });
        /*this.app.get('/dev/:id',function (req,res) {
            let id =  req.params.id;
            let tempUrl ='/dev/' +id;
            let url = req.originalUrl;
            if(req.originalUrl === tempUrl) {
                url  = req.originalUrl + '/index.html';
            } else if(req.originalUrl === tempUrl + '/'){
                url  = req.originalUrl + 'index.html';
            }
            res.redirect(url)
        });*/
        /*this.app.get('/dev/:id/!*',function (req,res) {
            let id =  req.params.id;

                let devInstance = store[id];
                this.app.use(require("webpack-hot-middleware")(devInstance.compiler));
                let filePath = req.originalUrl.replace('/dev/' + id , '');
                if(filePath === '' ||filePath === '/') {
                    filePath = "index.html";
                }
                let url = devInstance.getFilenameFromUrl('/') as string;
                url = join(url,filePath);
                let content = devInstance.fileSystem.readFileSync(url,'utf8');
                res.send(content)

        });*/
        this.app.use(function(err, req, res, next) {

            console.log(" error catch");

            res.status(err.status || 500);
            res.render('error');
        });

        this.app.listen(4000,function () {
                console.log(`服务器运行在: http://localhost:${4000}`);
         })


    }
}

let server = Server.bootstrap();


