"use strict";

var util = require('util');
var events = require('events');
var db = require("../models");

var noble = require('noble');
var bleno = require('bleno');

var cmdsC = require('./central');
var cmdsP = require('./peripheral');

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
var cmdsBle = new CmdsBle();

global.app = null;

var onInit = function () {
  cmdsBle.log("on Init Mode");
  setTimeout(() => {
    db.sql.sync().then(() => {
      if (noble.state === 'poweredOn' && bleno.state === 'poweredOn') {
        cmdsBle.log("Ready State");
        this.emit('standBy');
      } else {
        cmdsBle.error("Error Ready State");
        this.emit('init');
      }
    });
  }, 100);
};

function devicePreset() {
  var addr = noble.address.replace(/:/g, '');
  cmdsBle.log("My ADDR : " + addr);
  global.app = {
    dev: {
      id: 0,
      depth: 0,
      addr: addr,
      dbId: null
    },
    net: {
      nodeCount: 0,
      disc: {}
    },
    rxP: {
      headerCount: 0,
      dataCount: 0,
      totalCount: 0,
      processCount: 0,
    },
    txP: {
      totalCount: 0,
      processCount: 0
    }
  };

  return query.addHub(addr);
}

var onStandBy = function () {
  db.sql.sync().then(() => (!app) ? devicePreset() : '')
    .then(() => {
      // this.emit('pStandBy');
      if (!app.dev.nodeCount)
        this.emit('cScan');
      else if (app.txP.totalCount > app.txP.processCount)
        this.emit('cSendPacket');
      else
        this.emit('cStandBy');
    });
};

var onPStandBy = function () {
  cmdsP.startAdvertise();
  cmdsBle.log('Peripheral Start Advertising');
};

var onCScan = function () {
  cmdsC.startScan();
  cmdsBle.log('Central Start scanning network');
};

var findRoute = function (target) {
  return query.getNode({nodeNo: target})
    .then(node => (node.get('addr') in app.net.disc) ? app.net.disc[node.get('addr')] : reject("Not Found"))
};

var onCSend = function () {
  var header = pUtil.pHeader(app.txP[app.txP.processCount].header);
  cmdsBle.log("Dispatching Packet");
  return findRoute(header.tgt).then((node) => cmdsC.cmdsConn(node));
};

var oncStandBy = function () {
  noble.stopScanning();
  cmdsBle.log('Central Stop Scanning');
};

var onSendReady = () => cmdsBle.emit('cSend');

var onSendDone = function () {
  (app.txP.totalCount > app.txP.processCount) ? noble.emit('sendReady') : cmdsBle.emit('pStandBy');
  //TODO : if more or wait for receive and send, fix this.
};

var onInterpretReady = () => {
  cmdsBle.log('Start Interpreting');
  pInterpret.run();
};

var onInterpretDone = function () {
  if (app.rxP.totalCount > app.rxP.processCount) {
    cmdsBle.log('Additional Interpreting');
    bleno.emit('interpretReady');
  }
  else {
    cmdsBle.log('Dispatching Interpret Result, Disconnecting.');
    bleno.emit('interpretResult');
  }
};

noble.log = (str) => console.log("[C] " + str);
bleno.log = (str) => console.log("[P] " + str);

cmdsBle.on('init', onInit);
cmdsBle.on('standBy', onStandBy);

cmdsBle.on('pStandBy', onPStandBy);
cmdsBle.on('cScan', onCScan);

cmdsBle.on('cSend', onCSend);

cmdsBle.on('cStandBy', oncStandBy);

noble.on('sendReady', onSendReady);
noble.on('sendDone', onSendDone);

bleno.on('interpretReady', onInterpretReady);
bleno.on('interpretDone', onInterpretDone);

bleno.on('accept', () => {
  if (!cmdsBle.cConn()) {
    bleno.stopAdvertising();
    bleno.log("Central Connected, Stop Advertising.");
  }
});

cmdsBle.emit('init');
