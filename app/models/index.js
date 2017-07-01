"use strict";

var fs = require("fs");
var path = require("path");
var SQL = require("sequelize");
global.Sql = SQL;

var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '../../config.json'))[env];

var sql = new SQL('blockbee', config.username, config.password, config);
var appSql = new SQL('app_db', config.username, config.password, config);

var db = {};
var appDb = {};

function tableInit() {
  var dir = __dirname + '/node_db';
  fs
    .readdirSync(dir)
    .filter(function (file) {
      return (file.indexOf(".") !== 0);
    })
    .forEach(function (file) {
      var model = sql.import(path.join(dir, file));
      db[model.name] = model;
    });

  Object.keys(db).forEach(function (modelName) {
    if ("associate" in db[modelName]) {
      db[modelName].associate(db);
    }
  });

  db.Sensors.belongsTo(db.Nodes, {as: 'Node', foreignKey: 'nodeId'});
  db.Nodes.hasMany(db.Sensors, {foreignKey: 'nodeId'});
  db.Paths.belongsTo(db.Nodes, {as: 'Node', foreignKey: 'nodeId'});
  db.Nodes.hasMany(db.Paths, {foreignKey: 'nodeId'});
  db.SensorData.belongsTo(db.Sensors, {as: 'Sensor', foreignKey: 'sensorId'});
  db.Sensors.hasMany(db.SensorData, {foreignKey: 'sensorId'});

  db.Networks.belongsTo(db.Nodes, {as: 'Parent', foreignKey: 'parent'});
  db.Networks.belongsTo(db.Nodes, {as: 'Child', foreignKey: 'child'});

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

function appTableInit() {
  var dir = __dirname + '/app_db';
  fs
    .readdirSync(dir)
    .filter(function (file) {
      return (file.indexOf(".") !== 0);
    })
    .forEach(function (file) {
      var model = appSql.import(path.join(dir, file));
      appDb[model.name] = model;
    });
}

sql.sync({force: true})
  .then(() => tableInit())
  .then(() => appSql.sync({force: true})
    .then(() => appTableInit()));

// tableInit();

db.sql = sql;
db.SQL = SQL;
db.app = appDb;
db.appSql = appSql;

module.exports = db;
