var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');

var addHub = function (addr) {
  return retrieveNode({addr: addr, nodeNo: app.dev.id, depth: app.dev.depth})
    .spread((model) => app.dev.dbId = model.get('id'));
};

var addNode = function (nodeNo, parentNo, addr, rssi) {
  addr = addr.replace(/:/g, ''); //TODO: Maybe Duplicate ?
  cmds.log("Found Node : " + addr + " nodeNo : " + nodeNo + " rssi : " + rssi);

  return getNode({nodeNo: parentNo})
    .then(p => retrieveNode({addr: addr, nodeNo: nodeNo, depth: p.get('depth') + 1})
      .spread((c, newRow) => (!newRow) ? retrieveNetwork({parent: p.get('id'), child: c.get('id'), rssi: rssi}) :
        pBuild.run(cmdsBase.BuildType.SCAN_REQUEST, c.get('nodeNo'))
          .then(() => retrieveNetwork({parent: p.get('id'), child: c.get('id'), rssi: rssi}))))
    .spread((net) => updateNetwork({rssi: rssi, net: net.get('id')}));
};

var getNode = function (opt) {
  return db.Nodes.findOne({where: {$or: [{nodeNo: opt.nodeNo}, {addr: opt.addr}]}, rejectOnEmpty: true});
};

var retrieveNode = function (opt) {
  return db.Nodes.findOrCreate({where: {addr: opt.addr}, defaults: {nodeNo: opt.nodeNo, depth: opt.depth}});
};


var getAllNetwork = function () {
  return db.Networks.findAll({include: [{model: db.Nodes, as: 'Parent'}, {model: db.Nodes, as: 'Child'}]});
};

var retrieveNetwork = function (opt) {
  return db.Networks.findOrCreate({
    where: {$or: [{parent: opt.parent, child: opt.child}, {parent: opt.child, child: opt.parent}]},
    defaults: {rssi: opt.rssi, parent: opt.parent, child: opt.child}
  })
};

var updateNetwork = function (opt) {
  return db.Networks.update({rssi: opt.rssi}, {where: {id: opt.net}});
};

var addPath = function (nodeNo, path) {
  return getNode({nodeNo: nodeNo}).then((node) => retrievePath({nodeId: node.get('id'), path: path}));
};

var retrievePath = function (opt) {
  return db.Paths.findOrCreate({where: {nodeId: opt.target}, defaults: {path: opt.path}});
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;

module.exports.getNode = getNode;
module.exports.retrieveNode = retrieveNode;

module.exports.getAllNetwork = getAllNetwork;
module.exports.retrieveNetwork = retrieveNetwork;
module.exports.updateNetwork = updateNetwork;

module.exports.addPath = addPath;
module.exports.retrievePath = retrievePath;
