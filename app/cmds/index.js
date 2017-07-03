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
var _ = require('lodash');

var cmdsBase = require('./cmds_base');
var network = require('./network');

var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '../../config.json'))[env];

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
global.rCh = null; //Rabbit-MQ Channel

var chDataParse = function (data) {
  var receive = data.split(',');
  rCh.rQue.push(receive);
  return receive;
};

var onConsume = function (q) {
  rCh.consume(q, (msg) => {
    console.log(" [%s] Received %s", q, msg.content.toString());

    var data = chDataParse(msg.content.toString());
    var opt = null;
    var type = undefined;
    switch (q) {
      case 'node_q':
        type = cmdsBase.PktType.NODE_LED_REQ;
        opt = {ledString: data[3].toUpperCase()};
        break;

      case 'sensor_q': //Only temp or humi (DATA_REQUEST)
        type = cmdsBase.PktType.SNSR_DATA_REQ;

      case 'led_q': // (CMD_REQUEST)
      case 'remote_q':
      case 'buzzer_q':
        type = cmdsBase.PktType.SNSR_CMD_REQ;
        opt = {cmd: data[3]};
        break;
    }
    //data => [0] node [1] sensor [2] app_id [3] data
    (type !== undefined) ? pBuild.run(type, data[0], data[1], opt).then(() => cmds.emit('standBy')) : '';
  }, {noAck: true});
};

amqp.connect(config.amqp, function (err, conn) {
  conn.createChannel(function (err, ch) {
    global.rCh = ch;
    rCh.rQue = [];

    var queList = ['led_q', 'node_q', 'sensor_q', 'log_q', 'remote_q', 'buzzer_q'];
    queList.forEach(q => rCh.assertQueue(q, {durable: false}));
    cmds.log("AMQP Listening");
    queList.forEach(q => onConsume(q));

    cmds.emit('init');
  });
});

//TODO: Maybe not good solution for Global function. Assign to Other object.
global.getAppIdFromQue = function (node, snsr) {
  var appId = -1;
  for (var i = 0; i < rCh.rQue.length; i++) {
    if (rCh.rQue[i][0] === node && rCh.rQue[i][1] === snsr) {
      appId = rCh.rQue[i][2];
      rCh.rQue.splice(i, 1); //remove from Queue
      break;
    }
  }

  return appId;
};


var devPreset = function () {
  (env === "development") ? cmds.log("Develop ENV : Re-setting") : '';
  var addr = noble.address.replace(/:/g, '');
  cmds.log("My ADDR : " + addr);
  global.app = {
    dev: {
      id: 0,
      depth: 0,
      addr: addr,
      dbId: null,
      init: true,
      ack: false,
      ackTot: 0,
      ackCnt: 0,
      sendReady: false, //ack Send In-Progress
    },
    net: {
      set: false,
      updateId: false,
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
      procCnt: 0,
      send: false
    }
  };

  cfgUpdate(); //State Sync
  return query.addHub(addr);
};

var cfgLoad = function () {
  app.dev.ack = false;
  app.dev.ackTot = 0;
  app.dev.ackCnt = 0;
  app.dev.sendReady = false;
  app.rxP = {
    headerCnt: 0,
    dataCnt: 0,
    totalCnt: 0,
    procCnt: 0,
  };
  app.txP = {
    totalCnt: 0,
    procCnt: 0,
    send: false
  }
};

var onInit = function () {
  cmds.log("Initializing");
  setTimeout(() => {
    if (noble.state === 'poweredOn' && bleno.state === 'poweredOn') {
      db.sql.sync()
        .then(() => db.appSql.sync()
          .then(() => (env === "development" || !(_.has(app, 'dev.addr'))) ? devPreset() : cfgLoad())
          .then(() => cmds.emit('standBy')));
    } else {
      cmds.error("Error Ready State");
      this.emit('init');
    }
  }, 500);
};

// Sequence Choose
var onStandBy = function () {
  cmds.log("=======StandBy=======");
  // network.calcPath();
  setTimeout(() => {
    if (!app.net.nodeCnt) {
      cmds.log("Network Not Constructed!");
      this.emit('cScan');
    } else if (!app.net.set && app.net.responseCnt === app.net.nodeCnt) {
      app.dev.init = false;
      netSet();
    } else if (!app.dev.init && app.net.set && !app.dev.ack && !app.dev.sendReady) {
      netChk();
    } else if (app.txP.send && app.txP.procCnt > app.rxP.totalCnt) {
      cmds.log(app.txP.procCnt + "/" + app.rxP.totalCnt + " Waiting Response Packet.");
      this.emit('pStandBy');
    } else if (app.txP.totalCnt > app.txP.procCnt) {
      app.txP.send = true;
      cmds.log("Packet Send.");
      this.emit('cSend');
    } else {
      cmds.log("Network : " + app.net.set);
      cmds.log("Waiting for Accept!");
      this.emit('pStandBy');
    }
  }, 1000);
};


var netChk = function () {
  (!Object.keys(noble._peripherals).length) ? cmds.log("Ack Started. Re-Scan Depth 1.") : '';
  cmds.on('netAck', () => {
    app.dev.sendReady = true;
    cmds.emit('standBy')
  });

  // cmds.on('netAck', () => query.ackNode().then(() => cmds.emit('standBy')));
  (!Object.keys(noble._peripherals).length) ? cmds.emit('cScan') : cmds.emit('netAck');
};

var netSet = function () {
  cmds.log("Network Scanning out of : " + app.net.responseCnt + "/" + app.net.nodeCnt);

  network.calcPath()
    .then(() => (!app.net.updateId) ? netIdUpdate() : '')
    .then(() => {
      app.net.set = true;
      app.net.updateId = true;
      cfgUpdate();
      cmds.log("Network All Set!");
      cmds.emit('standBy');
    });
};

var netIdUpdate = function () {
  return query.getAllNode().then(nodes => {
    var nodeData = [];
    nodes.forEach(node => {
      if (node.nodeNo === app.dev.id) return;
      nodeData.push(pBuild.run(cmdsBase.PktType.NET_UPDATE_REQ, node.nodeNo, 0));
    });
    return nodeData;
  }).then((proc) => Promise.all(proc))
};

var onCScan = function () {
  cen.startScan();
  cmds.log('Central Start scanning network');
};

var findRoute = function (target) {
  return query.getNode({nodeNo: target})
    .then(n1 => (app.net.disc[n1.addr]) ? app.net.disc[n1.addr] : query.getPath({nodeId: n1.id})
      .then(res => query.getNode({nodeNo: res.path[0]}))
      .then(n2 => (app.net.disc[n2.addr]) ? app.net.disc[n2.addr] : reject("Error"))
    )
};

var onCSend = function () {
  cmds.log("Dispatching Packet");
  var header = pUtil.pHeader(app.txP[app.txP.procCnt].header); //TODO: Error with not resetting-DB.

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
