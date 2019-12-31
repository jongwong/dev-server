import { join, relative, resolve } from "path";
import { assign } from "lodash";
import { Files } from "../module/webpack/webpack-option-generate";

export const fsToKeyFile = async function(fs, pathUrl, newFile?) {
  if (newFile === undefined) {
    newFile = {};
  }

  let stat = fs.statSync(pathUrl);
  if (stat.isFile()) {
    let file = fs.readFileSync(pathUrl, "utf8");
    if (file) {
      let parentPath = resolve(pathUrl, "../");
      let relativePath = toRelative(pathUrl, "\\demoCode");
      newFile[relativePath] = file;
    }
  } else {
    let data = fs.readdirSync(pathUrl, "utf8");
    data.forEach(async function(item, index) {
      let childPath = join(pathUrl, item);
      let childFile = await fsToKeyFile(fs, childPath);
      newFile = assign(newFile, childFile);
    });
  }
  return newFile;
};

export const toRelative = function(path, str?) {
  path = resolve(path).replace(resolve(""), ".");
  if (str) {
    path = path.replace(str, "");
  }
  return path;
};

export const clonefsToMfs = function(fs, mfs, originPath, targetPath?) {
  let stat = fs.statSync(originPath);
  if (!targetPath) {
    targetPath = originPath;
  }
  if (stat.isFile()) {
    let file = fs.readFileSync(originPath, "utf8");
    if (file) {
      let targetParentPath = resolve(targetPath, "../");
      if (!mfs.existsSync(targetParentPath)) {
        mfs.mkdirpSync(targetParentPath);
      }
      mfs.writeFileSync(targetPath, file, "utf8");
    }
  } else {
    if (!mfs.existsSync(targetPath)) {
      mfs.mkdirpSync(targetPath);
    }
    fs.readdir(originPath, "utf8", function(err, data) {
      data.forEach(function(item, index) {
        let originChildPath = join(originPath, item);
        let targetChildPath = join(targetPath, item);
        clonefsToMfs(fs, mfs, originChildPath, targetChildPath);
      });
    });
  }
};
export const filesToFs = (context, files: Files, fs?) => {
  const keys = Object.keys(files);
  if (files) {
    if (fs) {
      keys.forEach(key => {
        const path = resolve(context, key);
        const parentPath = resolve(path, "../");
        if (!fs.existsSync(parentPath)) {
          fs.mkdirpSync(parentPath);
        }
        if (!files[key]) {
          files[key] = " ";
        }
        fs.writeFileSync(path, files[key]);
      });
    }
  }
};
