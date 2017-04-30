var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');

var addHub = function (addr) {
  return db.Nodes.findOrCreate({where: {addr: addr}})
    .spread((model) => app.dev.dbId = model.get('id'));
};

var addNode = function (nodeNo, parentNo, addr, rssi) {
  addr = addr.replace(/:/g, '');

  return db.Nodes.find({where: {nodeNo: parentNo}})
    .then((p) => db.Nodes.findOrCreate({where: {addr: addr}, defaults: {nodeNo: nodeNo, depth: p.get('depth') + 1}})
      .spread((c) => db.Networks.findOrCreate({
        where: {parent: p.get('id'), child: c.get('id')}, defaults: {rssi: rssi}
      })))
    .spread((net) => db.Networks.update({rssi: rssi}, {where: {id: net.get('id')}}))
    .spread(() => pBuild.run(cmdsBase.BuildType.SCAN_REQUEST, nodeNo));

  // return db.Nodes.findOrCreate({where: {addr: addr}, defaults: {nodeNo: nodeNo}})
  //   .spread((c) => db.Nodes.find({where: {nodeNo: parentNo}})
  //     .then((p) => db.Networks.findOrCreate({
  //       where: {parent: p.get('id'), child: c.get('id')}, defaults: {rssi: rssi}
  //     })))
  //   .spread((net) => db.Networks.update({rssi: rssi}, {where: {id: net.get('id')}}))
  //   .spread(() => pBuild.run(cmdsBase.BuildType.SCAN_REQUEST, nodeNo));
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;
