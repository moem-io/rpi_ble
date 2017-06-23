"use strict";

module.exports = function (sql, SQL) {
  var network_status = ['healthy', 'warning', 'error'];
  var Networks = sql.define('Networks', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    parent: {
      type: SQL.INTEGER.UNSIGNED,
      allowNull: false
    },
    child: {
      type: SQL.INTEGER.UNSIGNED,
      allowNull: false
    },
    rssi: {
      type: SQL.INTEGER(3),
      allowNull: false
    },
    status: {
      type: SQL.ENUM(network_status),
      defaultValue: network_status[0],
      allowNull: false
    },
    isActive: {
      type: SQL.BOOLEAN,
      defaultValue: true
    }
  });
  return Networks;
};
