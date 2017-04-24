"use strict";

var events = require('events');
var util = require('util');
var models = require("../models");

var noble = require('noble');
var bleno = require('bleno');

var cmdsC = require('./central');

var CmdsBle = function () {
  events.EventEmitter.call(this);
};

util.inherits(CmdsBle, events.EventEmitter);
var cmdsBle = new CmdsBle();

global.appState = null;

var onInit = function () {
  console.log("on StandBy Mode");
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
  appState = {
    dev: {
      id: 0,
      addr: noble.address.replace(/:/g, ''),
      dbId: null
    },
    net: {
      nodeCount: 0,
      disc: {}
    },
    rxP: {
      totalCount: 0,
      processCount: 0,
    },
    txP: {
      totalCount: 0,
      processCount: 0
    }
  };

  models.Nodes.create({
    nodeNo: appState.net.nodeCount,
    addr: noble.address.replace(/:/g, '')
  }).then(
    (model) => appState.dev.dbId = model.get('id')
  );
}

var onStandBy = function (callback) {
  if (!appState) {
    devicePreset();
  }
  models.sql.sync().then(() => {
    if (appState.txP.totalCount > appState.txP.processCount)
      this.emit('cStandBy');
    else
      this.emit('pStandBy');
  });
};

var onPStandBy = function () {
  cmdsC.startScan();
  console.log('Radio turned on!!');
};

var onCStandBy = function () {
  console.log('Channel has been changed to');
};

var onPStop = function () {
  bleno.stopAdvertising();
  console.log('Peripheral Stop Advertising!');
};

var onCStop = function () {
  noble.stopScanning();
  console.log('Central Stop Scanning');
};


cmdsBle.on('init', onInit);
cmdsBle.on('standBy', onStandBy);

cmdsBle.on('pStandBy', onPStandBy);
cmdsBle.on('cStandBy', onCStandBy);
cmdsBle.on('pStop', onPStop);
cmdsBle.on('cStop', onCStop);

cmdsBle.emit('init');


// module.exports = noble;
