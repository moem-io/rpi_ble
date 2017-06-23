"use strict";

module.exports = function (sql, SQL) {
  var AppLog = sql.define('AppLog', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    log_content: {
      type: SQL.STRING,
    },
    app_id: {
      type: SQL.INTEGER,
      allowNull: false,
    },
    node: {
      type: SQL.STRING,
      allowNull: false,
    },
    sensor: {
      type: SQL.STRING,
      allowNull: false,
    },
    created_date: {
      type: SQL.STRING,
      allowNull: false,
    }
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'app_log'
  });
  return AppLog;
};
