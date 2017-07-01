var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');
var moment = require('moment');

var addHub = function (addr) {
  return retrieveNode({addr: addr, nodeNo: app.dev.id, depth: app.dev.depth})
    .spread((model) => app.dev.dbId = model.id);
};

var addNode = function (nodeNo, parentNo, addr, rssi) {
  addr = addr.replace(/:/g, '');
  cmds.log("Found Node : " + addr + " nodeNo : " + nodeNo + " rssi : " + rssi);

  return getNode({nodeNo: parentNo})
    .then(p => retrieveNode({addr: addr, nodeNo: nodeNo, depth: p.depth + 1})
      .spread((c, newRow) => (!newRow) ? retrieveNetwork({parent: p.id, child: c.id, rssi: rssi}) :
        pBuild.run(cmdsBase.PktType.SCAN_REQUEST, c.nodeNo, 0)
          .then(() => retrieveNetwork({parent: p.id, child: c.id, rssi: rssi}))))
    .spread((net) => updateNetwork({rssi: rssi, netId: net.id}))
};

var ackNode = function () {
  return getAllNode().then(nodes => {
    cmds.log("Acking Node, Total : " + (nodes.length - 1));
    app.dev.ackTot = nodes.length;
    return Promise.all(Object.values(nodes).map(node => pBuild.run(cmdsBase.PktType.NET_ACK_REQUEST, node.nodeNo, 0)))
  })
};

var ackResult = function () {
  return getAllNode().then(nodes => nodes.forEach(n => cmds.log(n.nodeNo, n.addr, n.depth, n.status, n.isActive)))
};

var getNode = function (opt) {
  return db.Nodes.findOne({where: {$or: [{nodeNo: opt.nodeNo}, {addr: opt.addr}]}, rejectOnEmpty: true});
};

var getAllNode = function () {
  return db.Nodes.findAll({where: {isActive: 1}});
};

var retrieveNode = function (opt) {
  return db.Nodes.findOrCreate({where: {addr: opt.addr}, defaults: {nodeNo: opt.nodeNo, depth: opt.depth}});
};

var getNetsByNode = function (opt) { //gets isActive = 0,1 //not
  return getNode({nodeNo: opt.nodeNo}).then(node => {
    var where = {$or: [{parent: node.id}, {child: node.id}]};
    where['isActive'] = (opt.isActive) ? opt.isActive : 1;

    return getAllNetwork(where);
  });
};

var getAllNetwork = function (where = {isActive: 1}) { //gets isActive = 1
  return db.Networks.findAll({
    where: where, include: [{model: db.Nodes, as: 'Parent'}, {model: db.Nodes, as: 'Child'}]
  });
};

var retrieveNetwork = function (opt) {
  return db.Networks.findOrCreate({
    where: {$or: [{parent: opt.parent, child: opt.child}, {parent: opt.child, child: opt.parent}]},
    defaults: {rssi: opt.rssi, parent: opt.parent, child: opt.child}
  })
};


var updateNode = function (opt) {
  var query = {};
  (opt.isActive) ? query['isActive'] = opt.isActive : '';
  (opt.status) ? query['status'] = opt.status : '';

  var where = {};
  (opt.nodeNo) ? where['nodeNo'] = opt.nodeNo : '';
  (opt.addr) ? where['addr'] = opt.addr : '';

  return db.Nodes.update(query, {where: where});
};

var updateNetwork = function (opt) {
  var query = {};
  (opt.isActive) ? query['isActive'] = opt.isActive : '';
  (opt.rssi) ? query['rssi'] = opt.rssi : '';

  var where = {};
  (opt.netId) ? where['id'] = opt.netId : '';

  return db.Networks.update(query, {where: where});
};

var updatePath = function (opt) {
  var query = {};
  (opt.isActive) ? query['isActive'] = opt.isActive : '';

  var where = {};
  (opt.nodeId) ? where['nodeId'] = opt.nodeId : '';

  return db.Paths.update(query, {where: where});
};

var updatePathByNode = function (opt) {
  return getNode({nodeNo: opt.nodeNo}).then((node) => updatePath({nodeId: node.id, isActive: opt.isActive}));
};

var addPath = function (nodeNo, path) {
  return getNode({nodeNo: nodeNo}).then((node) => retrievePath({nodeId: node.id, path: path}));
};

var getPath = function (opt) {
  if (opt.nodeId) {
    return db.Paths.findOne({where: {nodeId: opt.nodeId}});
  }
  else if (opt.nodeNo) {
    return getNode({nodeNo: opt.nodeNo}).then((node) => db.Paths.findOne({where: {nodeId: node.id}}));
  }
};

var getAllPath = function () {
  return db.Paths.findAll({where: {isActive: 1}, include: [{model: db.Nodes, as: 'Node'}]});
};

var retrievePath = function (opt) {
  return db.Paths.findOrCreate({where: {nodeId: opt.nodeId}, defaults: {path: opt.path}})
    .spread((path, newRow) => (!newRow) ? path.updateAttributes({path: opt.path}) : true);
};

var getAppsByNode = function (opt) {
  return getNode({nodeNo: opt.nodeNo}).then((node) => {
    opt.in_node = node.id;
    return getAllApp(opt);
  });
};

//opt.*_node might be not Zero.
var getAllApp = function (opt) {
  var where = (opt.in_node) ? {in_node: opt.in_node, in_sensor: opt.in_sensor} :
    (opt.out_node) ? {out_node: opt.out_node, out_sensor: opt.out_sensor} : '';

  return db.app.Apps.findAll({where: where})
};

var retrieveSnsr = function (opt) {
  return db.Sensors.findOrCreate({where: {nodeId: opt.nodeId, sensorNo: opt.sensorNo}})
};

var getSnsr = function (opt) {
  return db.Sensors.findOne({where: {sensorNo: opt.sensorNo}})
};

var getAllSnsr = function (opt) {
  return db.Sensors.findAll()
};

var addSnsrData = function (opt) {
  return db.SensorData.create({where: {nodeId: opt.nodeId, sensorNo: opt.sensorNo}});
};

var getSnsrData = function (opt) {
  return db.SensorData.findOne({where: {sensorNo: opt.sensorNo}})
};

var addLogData = function (log, node = 1, sensor = 1) {
  return db.app.AppLog.create({
    log_content: log,
    app_id: 1,
    node: node,
    sensor: sensor,
    created_date: moment().format('lll')
  })
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;

module.exports.getNode = getNode;
module.exports.updateNode = updateNode;
module.exports.getAllNode = getAllNode;
module.exports.retrieveNode = retrieveNode;
module.exports.ackNode = ackNode;

module.exports.getNetsByNode = getNetsByNode;
module.exports.getAllNetwork = getAllNetwork;
module.exports.retrieveNetwork = retrieveNetwork;
module.exports.updateNetwork = updateNetwork;

module.exports.addPath = addPath;
module.exports.getPath = getPath;
module.exports.getAllPath = getAllPath;
module.exports.retrievePath = retrievePath;
module.exports.ackResult = ackResult;
module.exports.updatePath = updatePath;
module.exports.updatePathByNode = updatePathByNode;

module.exports.retrieveSnsr = retrieveSnsr; //*
module.exports.getAllSnsr = getAllSnsr; //*
module.exports.getSnsr = getSnsr; //*

module.exports.addSnsrData = addSnsrData; //*
module.exports.getSnsrData = getSnsrData; //*

module.exports.getAllApp = getAllApp;
module.exports.getAppsByNode = getAppsByNode;
module.exports.addLogData = addLogData;
