"use strict";

var util = require('util');
var events = require('events');
var db = require("../models");
var env = process.env.NODE_ENV || "development";


var noble = require('noble');
var bleno = require('bleno');
noble.log = (str) => console.log("[C] " + str);
bleno.log = (str) => console.log("[P] " + str);

var cen = require('./central');
var per = require('./peripheral');

var pInterpret = require('./packet/interpret');
var pUtil = require('./packet/util');
var pBuild = require('./packet/build');

var query = require('./query');
var amqp = require('amqplib/callback_api');

var cmdsBase = require('./cmds_base');

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
global.rabbitCh = null;

amqp.connect('amqp://node_rpi:node_rpi@localhost/nodeHost', function (err, conn) {
  conn.createChannel(function (err, ch) {
    global.rabbitCh = ch;
    rabbitCh.assertQueue('led_q', {durable: false});
    rabbitCh.assertQueue('btn_q', {durable: false});
    cmds.log("AMQP Listening", 'led_q');
    rabbitCh.consume('led_q', (msg) => {
      console.log(" [x] Received %s", msg.content.toString());

      //TODO: NODE Hard coded.
      pBuild.run(cmdsBase.PacketType.NODE_LED_REQUEST, 1, {ledString: msg.content.toString().toUpperCase()})
        .then(() => cmds.emit('standBy'));

    }, {noAck: true});
    cmds.emit('init');
  });
});


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
  // query.addAllPath(3);
  setTimeout(() => {
    if (!app.net.nodeCnt) {
      cmds.log("Network Not Constructed!");
      this.emit('cScan');
    } else if (app.txP.procCnt > app.rxP.totalCnt) {
      cmds.log(app.txP.procCnt + "/" + app.rxP.totalCnt);
      cmds.log("Waiting for Packet to receive to be End");
      this.emit('pStandBy');
    } else if (app.txP.totalCnt > app.txP.procCnt) {
      cmds.log("Packet Send.");
      this.emit('cSend');
    } else if (app.net.set === false && app.net.responseCnt === app.net.nodeCnt) {
      netSet();
    } else {
      cmds.log("Network : " + app.net.set + " Waiting for Accept!");
      this.emit('pStandBy');
    }
  }, 1000);
};

var netSet = function () {
  cmds.log("Network Scanning out of : " + app.net.responseCnt + "/" + app.net.nodeCnt);

  query.addAllPath(app.net.nodeCnt).then(() => {
    app.net.set = true;
    cmds.log("Network All Set!");
    cmds.emit('standBy');
  });
};

var onCScan = function () {
  cen.startScan();
  cmds.log('Central Start scanning network');
};

var findRoute = function (target) {
  return query.getNode({nodeNo: target}).then(n1 =>
    (app.net.disc[n1.addr]) ? app.net.disc[n1.addr] : query.getPath({nodeId: n1.id})
      .then(res => query.getNode({nodeNo: res.path[0]}))
      .then(n2 => (app.net.disc[n2.addr]) ? app.net.disc[n2.addr] : reject("Error"))
  )
};

var onCSend = function () {
  var header = pUtil.pHeader(app.txP[app.txP.procCnt].header);
  cmds.log("Dispatching Packet");
  return findRoute(header.tgt).then((node) => cen.cmdsConn(node)).catch(e => console.log(e));
}; // TODO: For Error Logging when Failure Connection

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
