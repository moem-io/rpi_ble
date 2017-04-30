"use strict";

module.exports = function (sql, SQL) {
  var node_status = ['healthy', 'warning', 'error'];
  var Nodes = sql.define('Nodes', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    depth: {
      type: SQL.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    nodeNo: {
      type: SQL.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    addr: {
      type: SQL.STRING(12),
      allowNull: false
    },
    status: {
      type: SQL.ENUM(node_status),
      defaultValue: node_status[0],
      allowNull: false
    },
    isActive: {
      type: SQL.BOOLEAN,
      defaultValue: true
    }
  });
  return Nodes;
};
