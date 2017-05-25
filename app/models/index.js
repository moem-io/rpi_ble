"use strict";

var fs = require("fs");
var path = require("path");
var SQL = require("sequelize");
global.Sql = SQL;

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

  db.Sensors.belongsTo(db.Nodes, {as: 'Node', foreignKey: 'nodeId'});
  db.Networks.belongsTo(db.Nodes, {as: 'Parent', foreignKey: 'parent'});
  db.Networks.belongsTo(db.Nodes, {as: 'Child', foreignKey: 'child'});
  db.Paths.belongsTo(db.Nodes, {as: 'Node', foreignKey: 'nodeId'});

  // 1:1 Relationship
  // belongsTo (a sub *source*, b main *target*) -> add FK to source. add method to Source
  // hasOne (a sub *source*, b main *target*) -> add FK to target. add Method to Target
  // as => Association, alias for relationship
  // foreignKey => name for FK. default for dbId
  // targetKey => Use when not referencing PK.
  //
  // a.belongsTo(b, {fK:'a1'});
  // a.belongsTo(b, {fK:'a2'});
  // available.
}

sql.sync({force: true}).then(() => tableInit());

// tableInit();

db.sql = sql;
db.SQL = SQL;

module.exports = db;
