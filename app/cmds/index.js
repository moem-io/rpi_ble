"use strict";

var util = require('util');
var events = require('events');
var models = require("../models");

var noble = require('noble');
var bleno = require('bleno');

var cmdsC = require('./central');
var cmdsP = require('./peripheral');

var packetInterpret = require('./packet/interpret');

var query = require('./query');

var CmdsBle = function () {
  events.EventEmitter.call(this);
};

util.inherits(CmdsBle, events.EventEmitter);
var cmdsBle = new CmdsBle();

global.appState = null;

var onInit = function () {
  console.log("on Init Mode");
  setTimeout(() => {
    models.sql.sync().then(() => {
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
  global.appState = {
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

  query.addNode(addr);
}

var onStandBy = function () {
  if (!appState) {
    devicePreset();
  }
  models.sql.sync().then(() => {
    this.emit('pStandBy');
    if (!appState.dev.nodeCount)
      this.emit('cScan');
    else if (appState.txP.totalCount > appState.txP.processCount)
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

var getTarget = function (count) {
  return appState.txP[count].header.readUInt8(5);
};

var findRoute = function (target) {
  if (target in appState.net.disc) {
    return appState.net.disc[target];
  } else {
    //TODO: make more elaborate - find route from DB.
  }
};

var onCSend = function () {
  console.log("Dispatching Packet");
  var targetNo = getTarget(appState.txP.processCount);
  cmdsC.cmdsConn(findRoute(targetNo));
};

var oncStandBy = function () {
  noble.stopScanning();
  console.log('Central Stop Scanning');
};

var onSendReady = function () {
  cmdsBle.emit('cSend');
};

var onSendDone = function () {
  if (appState.txP.totalCount >= appState.txP.processCount) {
    noble.emit('sendReady');
  }
  //TODO : if more to send, fix this.
};

var onInterpretReady = function () {
  packetInterpret.run();
};

var onInterpretDone = function () {
  if (appState.rxP.totalCount >= appState.rxP.processCount) {
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
