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
  events.EventEmitter.call(this);
};

util.inherits(CmdsBle, events.EventEmitter);
var cmdsBle = new CmdsBle();

global.app = null;

var onInit = function () {
  console.log("on Init Mode");
  setTimeout(() => {
    db.sql.sync().then(() => {
      if (noble.state === 'poweredOn' && bleno.state === 'poweredOn') {
        console.log("Ready State");
        this.emit('standBy');
      } else {
        console.error("Error Ready State");
        this.emit('init');
      }
    });
  }, 100);
};

function devicePreset() {
  var addr = noble.address.replace(/:/g, '');
  console.log("My ADDR : " + addr);
  global.app = {
    dev: {
      id: 0,
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
      this.emit('pStandBy');
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
  console.log('Peripheral Start Advertising');
};

var onCScan = function () {
  cmdsC.startScan();
  console.log('Central Start scanning network');
};

var findRoute = function (target) {
  if (target in app.net.disc) {
    return app.net.disc[target];
  } else {
    //TODO: make more elaborate - find route from DB.
  }
};

var onCSend = function () {
  var header = pUtil.pHeader(app.txP[app.txP.processCount].header);
  console.log("Dispatching Packet");
  cmdsC.cmdsConn(findRoute(header.tgt));
};

var oncStandBy = function () {
  noble.stopScanning();
  console.log('Central Stop Scanning');
};

var onSendReady = function () {
  cmdsBle.emit('cSend');
};

var onSendDone = function () {
  if (app.txP.totalCount >= app.txP.processCount) {
    noble.emit('sendReady');
  }
  //TODO : if more to send, fix this.
};

var onInterpretReady = function () {
  pInterpret.run();
};

var onInterpretDone = function () {
  if (app.rxP.totalCount >= app.rxP.processCount) {
    bleno.emit('interpretReady');
  }
};

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

cmdsBle.emit('init');
