"use strict";

module.exports = function (sql, SQL) {
  var SensorData = sql.define('SensorData', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sensorId: {
      type: SQL.INTEGER.UNSIGNED,
      allowNull: false
    },
    data: {
      type: SQL.STRING,
      allowNull: false
    }
  });
  return SensorData;
};
