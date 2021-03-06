"use strict";

module.exports = function (sql, SQL) {
  var sensor_type = ['B', 'H', 'S', 'R', 'I', 'Z', 'T', 'P', 'L', '0'];
  var sensor_status = ['healthy', 'warning', 'error'];
  var Sensors = sql.define('Sensors', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sensorNo: {
      type: SQL.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    type: {
      type: SQL.ENUM(sensor_type),
      allowNull: false
    },
    status: {
      type: SQL.ENUM(sensor_status),
      defaultValue: sensor_status[0],
      allowNull: false
    },
    isActive: {
      type: SQL.BOOLEAN,
      defaultValue: true
    },
    nodeId: {
      type: SQL.INTEGER.UNSIGNED,
      allowNull: false
    }
  });
  return Sensors;
};
