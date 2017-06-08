"use strict";

module.exports = function (sql, SQL) {
  var Apps = sql.define('Apps', {
    id: {
      type: SQL.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    app_id: {
      type: SQL.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true
    },
    in_node: {
      type: SQL.INTEGER.UNSIGNED
    },
    in_sensor: {
      type: SQL.INTEGER.UNSIGNED
    },
    out_node: {
      type: SQL.INTEGER.UNSIGNED
    },
    out_sensor: {
      type: SQL.INTEGER.UNSIGNED
    }
  }, {
    freezeTableName: true,
    createdAt: 'created_date',
    updatedAt: false,
    timestamps: true,
    tableName: 'app_setting'
  });
  return Apps;
};
