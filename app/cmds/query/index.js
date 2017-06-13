var db = require("../../models");
var cmdsBase = require('../cmds_base');
var pBuild = require('../packet/build');
var jsnx = require('jsnetworkx');
var request = require('request');

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
        pBuild.run(cmdsBase.PktType.SCAN_REQUEST, c.nodeNo)
          .then(() => retrieveNetwork({parent: p.id, child: c.id, rssi: rssi}))))
    .spread((net) => updateNetwork({rssi: rssi, net: net.id}))
};

//TODO: callback to Object.Keys.map() => Promise.all
var ackNode = function (callback) {
  var proc = [];
  return getAllNode().then(nodes => {
    cmds.log("Acking Node, Total : " + (nodes.length - 1));
    app.dev.ackTot = nodes.length;
    return Promise.all(
      Object.values(nodes).map(node => proc.push(pBuild.run(cmdsBase.PktType.NET_ACK_REQUEST, node.nodeNo)))
    ).then(callback);
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
  return db.Nodes.findAll();
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
  return getNode({nodeNo: nodeNo}).then((node) => retrievePath({nodeId: node.id, path: path}));
};

var addAllPath = function (nodeCnt) {
  var G = new jsnx.Graph();
  var proc = [];
  var pathGraph =
    {
      'node': [
        {name: 'Hub_0', radius: '10', rgb: '#5f5f5f'}
      ], 'link': []
    };

  return getAllNetwork().then(net => net.forEach(
    conn => {
      G.addEdge(conn.Parent.nodeNo, conn.Child.nodeNo, {weight: Math.abs(conn.rssi)});
      cmds.log(conn.Parent.nodeNo + " -> " + conn.Child.nodeNo + " RSSI : " + conn.rssi);
    }
  )).then(() => {
    for (var i = 1; i <= nodeCnt; i++) {
      var res = jsnx.bidirectionalShortestPath(G, 0, i, {weight: 'weight'});
      res.shift();
      res.pop();
      res = res.join('-');
      proc.push(addPath(i, res));
    }
    //[TODO] : PROMISE REJECT NON-ERROR
    return Promise.all(proc)
      .then(() => getAllPath()
        .then((paths) => extractPath(paths, G, sendData)))
      .catch(e => console.log(e));
  });
};

var sendData = function (data) {
  var opt = {
    uri: process.env.API_HOST + process.env.NODE_ENDPOINT,
    method: 'POST',
    json: data
  };
  // console.log(data);
  return request(opt, (e, res, body) => {
    (body == 'success') ? console.log(body + 1) : console.log(body);
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

//TODO: callback to Object.Keys.map() => Promise.all
var extractPath = function (paths, G, callback) {
  var node = [{'name': '0_HUB', 'radius': '12', 'rgb': getRandomColor()}];
  var link = [];
  var extract = [];

  paths.forEach(
    (pathRow, idx, arr) => {
      var pathTmp = [];

      node = node.concat([{'name': pathRow.Node.nodeNo + '_Node', 'radius': '8', 'rgb': getRandomColor()}]);

      (pathRow.path == '') ? '' : pathTmp = pathRow.path.split('-');
      pathTmp.unshift(0);
      pathTmp.push(pathRow.Node.nodeNo);

      pathTmp = pathTmp.map(Number);

      while (pathTmp.length > 1) {
        var c = pathTmp.pop();
        var p = pathTmp.slice(-1)[0];
        var addTmp = true;

        //TODO: toString Compare -> needs to be Fixed!
        for (var i = 0; i < extract.length; i++) {
          if ((extract[i].slice(0, 2).toString() == [p, c].toString())) {
            addTmp = false;
            break;
          }
        }

        data = G.getEdgeData(p, c);
        (addTmp) ? extract.push([p, c, data.weight]) : '';
        (addTmp) ? link = link.concat([{'source': p, 'target': c, 'length': (data.weight)}]) : '';
      }

      (idx == arr.length - 1) ? callback({node: node, link: link}) : '';
    }
  );
};

var getAllPath = function () {
  return db.Paths.findAll({include: [{model: db.Nodes, as: 'Node'}]});
};

var getPath = function (opt) {
  if (opt.nodeId) {
    return db.Paths.findOne({where: {nodeId: opt.nodeId}});
  }
  else if (opt.nodeNo) {
    return getNode({nodeNo: opt.nodeNo}).then((node) => db.Paths.findOne({where: {nodeId: node.id}}));
  }
};

var retrievePath = function (opt) {
  return db.Paths.findOrCreate({where: {nodeId: opt.nodeId}, defaults: {path: opt.path}})
    .spread((path, newRow) => (!newRow) ? path.updateAttributes({path: opt.path}) : true);
};

//opt.*_node might be not Zero.
var getAllApp = function (opt) {
  if (opt.in_node) {
    return db.Apps.findAll({where: {in_node: opt.in_node, in_sensor: opt.in_sensor}})
  } else if (opt.out_node) {
    return db.Apps.findAll({where: {out_node: opt.out_node, out_sensor: opt.out_sensor}})
  }
};

module.exports.addHub = addHub;
module.exports.addNode = addNode;

module.exports.getNode = getNode;
module.exports.getAllNode = getAllNode;
module.exports.retrieveNode = retrieveNode;
module.exports.ackNode = ackNode;

module.exports.getAllNetwork = getAllNetwork;
module.exports.retrieveNetwork = retrieveNetwork;
module.exports.updateNetwork = updateNetwork;

module.exports.addPath = addPath;
module.exports.addAllPath = addAllPath;
module.exports.getPath = getPath;
module.exports.getAllPath = getAllPath;
module.exports.retrievePath = retrievePath;
module.exports.ackResult = ackResult;

module.exports.getAllApp = getAllApp;
