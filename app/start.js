var fs;
try {
  fs = require('graceful-fs');
} catch (_) {
  fs = require('fs');
}

var cfgFile = './config/default.json';
var cJSON = require('circular-json');

global.cfgUpdate = function () {
  fs.writeFile(cfgFile, cJSON.stringify(app));
};

global.app = require('config');
(app.has('dev.addr')) ? console.log("Start Device!") : console.log("Init Device!");

global.Sql = null;

cfgUpdate();

var cmds = require('./cmds');
