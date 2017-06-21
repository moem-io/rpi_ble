var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');
var jsnx = require('jsnetworkx');
var request = require('request');
var _ = require('lodash');

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
    .spread((net) => updateNetwork({rssi: rssi, net: net.id}))
};

var updateNode = function (opt) {
  var attr = (opt.status !== null) ? {status: opt.status} : (opt.isActive !== null) ? {isActive: opt.isActive} : '';
  return db.Nodes.update(attr, {where: {$or: [{nodeNo: opt.nodeNo}, {addr: opt.addr}]}});
};

var ackNode = function () {
  return getAllNode().then(nodes => {
    cmds.log("Acking Node, Total : " + (nodes.length - 1));
    app.dev.ackTot = nodes.length;
    return Promise.all(Object.values(nodes).map(node => pBuild.run(cmdsBase.PktType.NET_ACK_REQUEST, node.nodeNo, 0)))
  })
};

var ackResult = function () {
  return getAllNode().then(nodes => nodes.forEach(
    n => cmds.log(n.nodeNo, n.addr, n.depth, n.status, n.isActive)
  ))
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


var getNetworks = function (opt) { //gets isActive = 0,1 //not
  var query = {$or: [{parent: opt.nodeId}, {child: opt.nodeId}]};
  if (opt.isActive) {
    query['isActive'] = 1
  }
  return db.Networks.findAll({
    where: query,
    include: [{model: db.Nodes, as: 'Parent'}, {model: db.Nodes, as: 'Child'}]
  });
};


var getAllNetwork = function () { //gets isActive = 1
  return db.Networks.findAll({
    where: {isActive: 1}, include: [{model: db.Nodes, as: 'Parent'}, {model: db.Nodes, as: 'Child'}]
  });
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
  return getNode({nodeNo: nodeNo}).then((node) => retrievePath({nodeId: node.id, path: path}));
};

var addAllPath = function (nodeCnt) {
  var G = new jsnx.Graph();
  var proc = [];
  var pathGraph = {'node': [], 'link': []};
  pathGraph['node'].push({name: 'Hub_0', radius: '10', rgb: '#5f5f5f'});

  return getAllNetwork().then(net => net.forEach(
    conn => {
      G.addEdge(conn.Parent.nodeNo, conn.Child.nodeNo, {weight: Math.abs(conn.rssi)});
      cmds.log(conn.Parent.nodeNo + " -> " + conn.Child.nodeNo + " RSSI : " + conn.rssi);
    }
  )).then(() => {
    jsnx.forEach(G, (n) => {
      if (n === 0) {
        return;
      }
      var res = jsnx.bidirectionalShortestPath(G, 0, n, {weight: 'weight'});
      res.shift();
      res.pop();
      res = res.join('-');
      proc.push(addPath(n, res));
    });
    //[TODO] : PROMISE REJECT NON-ERROR , Maybe Fixed.
    return Promise.all(proc)
      .then(() => extractPath(G, sendData))
      .catch(e => console.log(e));
  });
};

var sendData = function (data) {
  var opt = {uri: process.env.API_HOST + process.env.NODE_ENDPOINT, method: 'POST', json: data};
  // console.log(data);
  return request(opt, (e, res, body) => {
    (body === 'success') ? console.log("API Server Updated") : console.log(body);
  });
};

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

var extractPath = function (G, callback) {
  var node = [{'name': '0_HUB', 'radius': '12', 'rgb': getRandomColor()}];
  var link = [];
  var allPath = [];

  return getAllPath()
    .then((paths) => Promise.all(Object.values(paths).map((pathRow) => {
      node = node.concat([{'name': pathRow.Node.nodeNo + '_Node', 'radius': '8', 'rgb': getRandomColor()}]);

      path = (pathRow.path === '') ? [] : pathRow.path.split('-');
      path.unshift(0);
      path.push(pathRow.Node.nodeNo);
      path = path.map(Number);

      while (path.length > 1) {
        var c = path.pop();
        var p = path.slice(-1)[0];
        var addTmp = true;

        for (var i = 0; i < allPath.length; i++) {
          if ((_.isEqual(allPath[i].slice(0, 2), [p, c])) || (_.isEqual(allPath[i].slice(0, 2), [c, p]))) {
            addTmp = false;
            break;
          }
        }

        data = G.getEdgeData(p, c);
        (addTmp) ? allPath.push([p, c, data.weight]) : '';
        (addTmp) ? link = link.concat([{
          'source': searchIdx(p, node),
          'target': searchIdx(c, node),
          'length': (data.weight)
        }]) : '';
      }
    })).then(callback({node: node, link: link})));
};

var searchIdx = function (no, node) {
  var idxVal = undefined;
  node.forEach((n, idx) => {
    var tmp = n.name.split('_');
    if (_.isEqual(no,parseInt(tmp[0]))) {
      idxVal = idx;
    }
  });
  return idxVal;
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

//opt.*_node might be not Zero.
var getAllApp = function (opt) {
  var qOpt = (opt.in_node) ? {in_node: opt.in_node, in_sensor: opt.in_sensor} :
    (opt.out_node) ? {out_node: opt.out_node, out_sensor: opt.out_sensor} : '';

  return db.app.Apps.findAll({where: qOpt})
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

module.exports.addHub = addHub;
module.exports.addNode = addNode;

module.exports.getNode = getNode;
module.exports.updateNode = updateNode;
module.exports.getAllNode = getAllNode;
module.exports.retrieveNode = retrieveNode;
module.exports.ackNode = ackNode;

module.exports.getNetworks = getNetworks;
module.exports.getAllNetwork = getAllNetwork;
module.exports.retrieveNetwork = retrieveNetwork;
module.exports.updateNetwork = updateNetwork;

module.exports.addPath = addPath;
module.exports.addAllPath = addAllPath;
module.exports.getPath = getPath;
module.exports.getAllPath = getAllPath;
module.exports.retrievePath = retrievePath;
module.exports.ackResult = ackResult;

module.exports.retrieveSnsr = retrieveSnsr; //*
module.exports.getAllSnsr = getAllSnsr; //*
module.exports.getSnsr = getSnsr; //*

module.exports.addSnsrData = addSnsrData; //*
module.exports.getSnsrData = getSnsrData; //*

module.exports.getAllApp = getAllApp;
