const getClient = function() {
  if (!window.webpack_hot_client) {
    window.webpack_hot_client = require("webpack-hot-middleware/client");
  }
  return window.webpack_hot_client;
};

const getIdByUrl = function() {
  let matchs = window.location.pathname.match(/[/]dev[/][^/]*/);
  if (matchs[0]) {
    return matchs[0].replace("/dev/", "");
  }
};
const hotClient = getClient();
let id = getIdByUrl();
if (id) {
  hotClient.setOptionsAndConnect({ path: "/dev/" + id + "/__webpack_hmr" });
}
