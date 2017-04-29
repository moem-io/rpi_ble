"use strict";

// var cmds = require("./cmds");
var db = require('./models');

console.log(__dirname);

db.sql.sync().then(
  () => {
    db.Nodes.create({
      nodeNo: 0,
      addr: '0123456789AB'
    });
    db.Sensors.create({
      sensorNo: 1,
      type: "typeA",
      nodeId: 1
    });
    db.Networks.create({
      parent: 1,
      child: 2,
      rssi: 100
    });
  }
);

db.sql.sync().then(
  () => db.Nodes.findAll().then(
    nodes => nodes.forEach(
      node => console.log(node.id, node.nodeNo, node.status)
    )
  )
);

db.sql.sync().then(
  () => {
    return db.Nodes.findOne({where: {id: 1199}}).then(
      (nodes) => console.log(nodes)).catch((err) => console.log("err"));
  }
);
