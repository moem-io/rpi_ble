"use strict";

module.exports = function (sql, SQL) {
  var Paths = sql.define('Paths', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    target: {
      type: SQL.INTEGER.UNSIGNED,
      references: {model: sql.models.Nodes, key: "id"},
      allowNull: false,
      unique: true
    },
    path: {
      type: SQL.STRING
    },
    isActive: {
      type: SQL.BOOLEAN,
      defaultValue: true
    }
  });
  return Paths;
};
