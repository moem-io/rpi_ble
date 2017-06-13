var fs;
try {
  fs = require('graceful-fs');
} catch (_) {
  fs = require('fs');
}

var cfgFile = './config/default.json';
var cJSON = require('circular-json');
var _ = require('lodash');

global.cfgUpdate = function () {
  fs.writeFile(cfgFile, cJSON.stringify(app));
};

var cfgData = fs.readFileSync(cfgFile);
global.app = (cfgData.length) ? cJSON.parse(cfgData) : {};

(_.has(app, 'dev.addr')) ? console.log("Start Device!") : console.log("Init Device!");

global.Sql = null;

cfgUpdate();

var cmds = require('./cmds');
