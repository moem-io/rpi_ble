"use strict";

var util = require('util');
var events = require('events');
var db = require("../models");
var env = process.env.NODE_ENV || "development";
var jsnx = require('jsnetworkx');

var noble = require('noble');
var bleno = require('bleno');
noble.log = (str) => console.log("[C] " + str);
bleno.log = (str) => console.log("[P] " + str);

var cen = require('./central');
var per = require('./peripheral');

var pInterpret = require('./packet/interpret');
var pUtil = require('./packet/util');

var query = require('./query');

var CmdsBle = function () {
  this.log = (str) => console.log("[APP] " + str);
  this.error = (str) => console.error("[APP] " + str);
  this.cConn = () => {
    var res = false;
    Object.keys(noble._peripherals).forEach(
      k => (res || noble._peripherals[k].state === 'connected') ? res = true : ''
    );
    return res;
  };
  events.EventEmitter.call(this);
};

util.inherits(CmdsBle, events.EventEmitter);
global.cmds = new CmdsBle();

var devPreset = function () {
  (env === "development") ? cmds.log("Develop ENV : Re-setting") : '';
  var addr = noble.address.replace(/:/g, '');
  cmds.log("My ADDR : " + addr);
  global.app = {
    dev: {
      id: 0,
      depth: 0,
      addr: addr,
      dbId: null
    },
    net: {
      set: false,
      responseCnt: 0,
      nodeCnt: 0,
      disc: {}
    },
    rxP: {
      headerCnt: 0,
      dataCnt: 0,
      totalCnt: 0,
      procCnt: 0,
    },
    txP: {
      totalCnt: 0,
      procCnt: 0
    }
  };

  cfgUpdate(); //State Sync
  return query.addHub(addr);
};

var onInit = function () {
  cmds.log("on Init Mode");
  setTimeout(() => {
    if (noble.state === 'poweredOn' && bleno.state === 'poweredOn') {
      db.sql.sync()
        .then(() => (env === "development" || !app.has('dev.addr')) ? devPreset() : '')
        .then(() => cmds.emit('standBy'));
    } else {
      cmds.error("Error Ready State");
      this.emit('init');
    }
  }, 500);
};

// Sequence Choose
var onStandBy = function () {
  cmds.log("standBy Mode.");

  if (!app.net.nodeCnt) {
    cmds.log("Network Not Constructed!");
    this.emit('cScan');
  } else if (app.txP.totalCnt > app.txP.procCnt) {
    cmds.log("Packet Send.");
    this.emit('cSend');
  } else if (app.net.set === false && app.net.responseCnt === app.net.nodeCnt) {
    netSet();
  } else {
    cmds.log("Network : " + app.net.set + " Waiting for Accept!");
    this.emit('pStandBy');
  }
};

var netSet = function () {
  cmds.log("Network Scanning out of : " + app.net.responseCnt + "/" + app.net.nodeCnt);
  var G = new jsnx.Graph();
  query.getAllNetwork().then(net => net.forEach(
    conn => {
      G.addEdge(conn.parent, conn.child, {weight: conn.rssi});
      cmds.log(conn.parent + " -> " + conn.child + " RSSI : " + conn.rssi);
    }
  )).then(() => {
    for (var i = 1; i <= app.net.nodeCnt; i++) {
      var res = jsnx.bidirectionalShortestPath(G, 0, i, {weight: 'weight'});
      res.shift();
      res.pop();
      res = res.join('-');
      query.addPath(i, res);
    }
  }).then(() => {
    app.net.set = true;
    cmds.emit('standBy');
  });
};

var onCScan = function () {
  cen.startScan();
  cmds.log('Central Start scanning network');
};

var findRoute = function (target) {
  return query.getNode({nodeNo: target})
    .then(node => (node.get('addr') in app.net.disc) ? app.net.disc[node.get('addr')] : () => {
      throw new Error("Not Found!") //May not work with Async Calls.
    });
};

var onCSend = function () {
  var header = pUtil.pHeader(app.txP[app.txP.procCnt].header);
  cmds.log("Dispatching Packet");
  return findRoute(header.tgt).then((node) => cen.cmdsConn(node));
};

var onCSendDone = function () {
  cfgUpdate(); //State Sync
  cmds.emit('standBy');
};

var onPStandBy = function () {
  per.startAdvertise();
  cmds.log('Peripheral Start Advertising');
};

var onInterpret = function () {
  cmds.log('Start Interpreting');
  pInterpret.run();
};

var onInterpretDone = function () {
  cfgUpdate(); //State Sync
  cmds.emit('standBy');
};

cmds.on('init', onInit);
cmds.on('standBy', onStandBy);

cmds.on('cScan', onCScan);
cmds.on('cSend', onCSend);
cmds.on('cSendDone', onCSendDone);

cmds.on('pStandBy', onPStandBy);

cmds.on('interpret', onInterpret);
cmds.on('interpretDone', onInterpretDone);

cmds.emit('init');
