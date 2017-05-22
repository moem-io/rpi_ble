"use strict";

var util = require('util');
var events = require('events');
var db = require("../models");

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

var onInit = function () {
  cmds.log("on Init Mode");
  setTimeout(() => {
    db.sql.sync().then(() => {
      if (noble.state === 'poweredOn' && bleno.state === 'poweredOn') {
        cmds.log("Ready State");
        this.emit('standBy');
      } else {
        cmds.error("Error Ready State");
        this.emit('init');
      }
    });
  }, 100);
};

var devPreset = function () {
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

// After Init, Sequence Choose
var onStandBy = function () {
  db.sql.sync().then(() => (!app.has('dev.addr')) ? devPreset() : '')
    .then(() => {
      if (!app.net.nodeCnt) {
        cmds.log("Network Not Constructed!");
        this.emit('cScan');
      } else if (app.txP.totalCnt > app.txP.procCnt) // Maybe Unusual Failure.
        this.emit('cSendPacket');
      else {
        cmds.log("Network Constructed. Waiting for Accept!");
        this.emit('pStandBy');
      }
    });
};

var onCScan = function () {
  cen.startScan();
  cmds.log('Central Start scanning network');
};

//TODO: REJECT ERROR.
var findRoute = function (target) {
  return query.getNode({nodeNo: target})
    .then(node => (node.get('addr') in app.net.disc) ? app.net.disc[node.get('addr')] : reject("Not Found"))
};

var onCSend = function () {
  var header = pUtil.pHeader(app.txP[app.txP.procCnt].header);
  cmds.log("Dispatching Packet");
  return findRoute(header.tgt).then((node) => cen.cmdsConn(node));
};

var onCSendDone = function () {
  (app.txP.totalCnt > app.txP.procCnt) ? cmds.emit('cSend') : cmds.emit('pStandBy');
  cfgUpdate(); //State Sync
};

var onInterpretReady = function () {
  cmds.log('Start Interpreting');
  pInterpret.run();
};

var onInterpretDone = function () {
  if (app.rxP.totalCnt > app.rxP.procCnt) {
    cmds.log('Additional Interpreting');
    cmds.emit('interpretReady');
  }
  else {
    cmds.log('Dispatching Interpret Result. Waiting for Disconnection.');
    bleno.emit('interpretResult');
  }
};

var onPStandBy = function () {
  per.startAdvertise();
  cmds.log('Peripheral Start Advertising');
  cfgUpdate(); //State Sync
};

cmds.on('init', onInit);
cmds.on('standBy', onStandBy);

cmds.on('cScan', onCScan);
cmds.on('cSend', onCSend);
cmds.on('cSendDone', onCSendDone);

cmds.on('pStandBy', onPStandBy);

cmds.on('interpretReady', onInterpretReady);
cmds.on('interpretDone', onInterpretDone);

cmds.emit('init');
