var db = require("../../models");
var cmdsBase = require('../cmds-base');
var packetBuild = require('../packet/build');

var addHub = function (addr) {
  return db.Nodes.findOrCreate({where: {addr: addr}})
    .spread((model) => app.dev.dbId = model.get('id'));
};

var addNode = function (nodeNo, parentNo, addr, rssi) {
  addr = addr.replace(/:/g, '');

  return db.Nodes.findOrCreate({where: {addr: addr}, defaults: {nodeNo: nodeNo}})
    .spread((c) => db.Nodes.find({where: {nodeNo: parentNo}})
      .then((p) => db.Networks.findOrCreate({
        where: {parent: p.get('id'), child: c.get('id')}, defaults: {rssi: rssi}
      })))
    .spread((net) => db.Networks.update({rssi: rssi}, {where: {id: net.get('id')}}));

  // .spread(() => {
  //   return packetBuild.run(cmdsBase.BuildType.SCAN_REQUEST, {nodeNo: nodeNo}, callback);
  // });
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;
