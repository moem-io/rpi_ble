"use strict";

var fs        = require("fs");
var path      = require("path");
var env       = process.env.NODE_ENV || "development";
var Sequelize = require("sequelize");
var config    = require(__dirname + '/../../config.json')[env];

var sql       = new Sequelize(config.database, config.username, config.password, config);
var db        = {};

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "import.js");
  })
  .forEach(function(file) {
    var model = sql.import(path.join(__dirname, file));
    db[model.name] = model;
  });

db.sql = sql;
db.Sequelize = Sequelize;

module.exports = db;

console.log("Hi");
