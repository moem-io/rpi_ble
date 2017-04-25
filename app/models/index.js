"use strict";

var fs = require("fs");
var path = require("path");
var SQL = require("sequelize");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '../../config.json'))[env];

var sql = new SQL(config.database, config.username, config.password, config);
var db = {};


function tableInit() {
  fs
    .readdirSync(__dirname)
    .filter(function (file) {
      return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function (file) {
      var model = sql.import(path.join(__dirname, file));
      db[model.name] = model;
    });

  Object.keys(db).forEach(function (modelName) {
    if ("associate" in db[modelName]) {
      db[modelName].associate(db);
    }
  });
}

sql.sync({force: true}).then(() => tableInit());

/*tableInit();*/

db.sql = sql;
db.SQL = SQL;

module.exports = db;
