var jsnx = require('jsnetworkx');
var query = require('../query');
var _ = require('lodash');
var request = require('request');

var calcPath = function (api = true) {
  var G = new jsnx.Graph();
  var proc = [];
  var pathGraph = {'node': [], 'link': []};
  pathGraph['node'].push({name: 'Hub_0', radius: '10', rgb: '#5f5f5f'});

  return query.getAllNet().then(net => net.forEach(
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
      proc.push(query.addPath(n, res));
    });
    //[TODO] : PROMISE REJECT NON-ERROR , Maybe Fixed.
    return Promise.all(proc)
      .then(() => (api) ? extractPath(G, syncApiPath) : '')
  });
};

var extractPath = function (G, callback) {
  var node = [{'name': '0_HUB', 'radius': '12', 'rgb': getRandomColor()}];
  var link = [];
  var allPath = [];

  return query.getAllPath().then((paths) => {
    Object.values(paths).forEach((pRow => {
      node = node.concat([{'name': pRow.Node.nodeNo + '_Node', 'radius': '8', 'rgb': getRandomColor()}]);
    }));
    return Promise.all(Object.values(paths).map((pathRow) => {

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
          'source': searchPathIdx(p, node),
          'target': searchPathIdx(c, node),
          'length': (data.weight)
        }]) : '';
      }
    })).then(callback({node: node, link: link}))
  });
};

var syncApiPath = function (data) {
  var opt = {uri: process.env.API_HOST + process.env.NODE_ENDPOINT, method: 'POST', json: data};
  // console.log(data);
  return request(opt, (e, res, body) => {
    (body === 'success') ? console.log("API Server Updated") : console.log(body);
  });
};

var getRandomColor = function () {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

var searchPathIdx = function (no, node) {
  var idxVal = undefined;
  node.forEach((n, idx) => {
    var tmp = n.name.split('_');
    if (_.isEqual(no, parseInt(tmp[0]))) {
      idxVal = idx;
    }
  });
  return idxVal;
};


module.exports.calcPath = calcPath;
