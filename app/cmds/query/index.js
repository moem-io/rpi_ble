var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');

var addHub = function (addr) {
  return retrieveNode({addr: addr, nodeNo: app.dev.id, depth: app.dev.depth})
    .spread((model) => app.dev.dbId = model.get('id'));
};

var addNode = function (nodeNo, parentNo, addr, rssi) {
  addr = addr.replace(/:/g, ''); //TODO: Duplicate ?
  cmds.log("Found Node : " + addr + " nodeNo : " + nodeNo);

  return getNode({nodeNo: parentNo})
    .then(p => retrieveNode({addr: addr, nodeNo: nodeNo, depth: p.get('depth') + 1})
      .spread(c => pBuild.run(cmdsBase.BuildType.SCAN_REQUEST, c.get('nodeNo'))
        .then(() => db.Networks.findOrCreate({
          where: {$or: [{parent: p.get('id'), child: c.get('id')}, {parent: c.get('id'), child: p.get('id')}]},
          defaults: {rssi: rssi, parent: p.get('id'), child: c.get('id')}
        }))
      ))
    .spread((net) => db.Networks.update({rssi: rssi}, {where: {id: net.get('id')}}));
};

var getNode = function (opt) {
  return db.Nodes.findOne({where: {$or: [{nodeNo: opt.nodeNo}, {addr: opt.addr}]}, rejectOnEmpty: true});
};

var retrieveNode = function (opt) {
  return db.Nodes.findOrCreate({where: {addr: opt.addr}, defaults: {nodeNo: opt.nodeNo, depth: opt.depth}})
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;

module.exports.getNode = getNode;
module.exports.retrieveNode = retrieveNode;
