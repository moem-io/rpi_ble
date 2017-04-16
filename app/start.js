"use strict";

var models = require("./models");

console.log(__dirname);

models.sql.sync().then(
  () => models.Nodes.create({
    nodeNo: 0,
    addr: '0123456789AB'
  })
);
models.sql.sync().then(
  () => models.Sensors.create({
    sensorNo: 1,
    type: "typeA",
    nodeId: 1
  })
);

models.sql.sync().then(
  () => models.Networks.create({
    parent: 1,
    child: 2,
    rssi: 100
  })
);

models.sql.sync().then(
  () => models.Nodes.findAll().then(
    nodes => nodes.forEach(
      node => console.log(node.id, node.nodeNo, node.status)
    )
  )
);

