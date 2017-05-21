global.cfg = require('jsonfile');
global.cfgFile = './config/default.json';


global.app = require('config');
(app.has('dev.addr')) ? console.log("Device Set!") : console.log("First Time Set!");

app.a = 'hi';
cfg.writeFile(cfgFile, app, (e) => console.log(e));

var cmds = require('./cmds');

// "use strict";
// var jsnx = require('jsnetworkx');
//
// var G = new jsnx.Graph();
// G.addEdge('A', 'B', {weight:4})
// G.addEdge('B', 'D', {weight:2})
// G.addEdge('A', 'C', {weight:3})
// G.addEdge('C', 'D', {weight:4})
// // var a = jsnx.shortestPath(G,'A','D',{weight:'weight'})
// var a = jsnx.bidirectionalShortestPath(G,'A','D',{weight:'weight'});
//
// console.log(a);
//
// // for(var i=0;i<length;i++){ //length > ? >=
// //   jsnx.bidirectionalShortestPath(G,0,i,{weight:'weight'});
// // }
//
// var jsonfile = require('jsonfile');
// var file = '/tmp/data.json';
// jsonfile.readFile(file, function(err, obj) {
//   console.dir(obj)
// });
//
//
// var cfg = require('config');
// cfg.set('Customer.dbConfig',{value:'true'});
//
// // var cmds = require("./cmds");
// var db = require('./models');
// var query = require('./cmds/query');
//
// var sl = require('sequelize');
// console.log(__dirname);
// //
// // db.sql.sync().then(
// //   () => {
// //     db.Nodes.create({
// //       nodeNo: 0,
// //       addr: '0123456789AB'
// //     });
// //     db.Sensors.create({
// //       sensorNo: 1,
// //       type: "typeA",
// //       nodeId: 1
// //     });
// //     db.Networks.create({
// //       parent: 1,
// //       child: 2,
// //       rssi: 100
// //     });
// //   }
// // );
// //
// // db.sql.sync().then(
// //   () => db.Nodes.findAll().then(
// //     nodes => nodes.forEach(
// //       node => console.log(node.id, node.nodeNo, node.status)
// //     )
// //   )
// // );
// //
// // db.sql.sync().then(
// //   () => {
// //     return db.Nodes.findOne({where: {id: 1199}}).then(
// //       (nodes) => console.log(nodes)).catch((err) => console.log("err"));
// //   }
// // );
// //
//
// //
// // db.sql.sync().then(
// //   () => query.findNode({nodeNo: null}).then(
// //     node => console.log(node.get('addr'))
// //   ).catch(err => {
// //     console.log("Maybe Error");
// //     console.log(err);
// //   })
// // );
// //
