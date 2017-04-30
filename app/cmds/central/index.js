"use strict";

var noble = require('noble');
var query = require('../query');
var cmdsBase = require('../cmds_base');

var pBuild = require('../packet/build');

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

function cmdsStartScan() {
  noble.startScanning([cmdsBase.BaseUuid]);
  setTimeout(() => noble.stopScanning(), cmdsBase.scanTimeout);
}

noble.on('discover', (node) => {
  console.log('found node:', node.advertisement.localName);
});

noble.on('scanStop', () => {
  console.log("Scan Stopped");
  var nodes = Object.keys(noble._peripherals);

  if (nodes.length) {
    Promise.all(nodes.map((uuid) => {
      var node = noble._peripherals[uuid];
      app.net.nodeCount++;
      app.net.disc[app.net.nodeCount] = node;

      return query.addNode(app.net.nodeCount, app.dev.id, node.address, node.rssi)
    })).then(() => noble.emit('sendReady'));
  } else {
    console.error("[Warning] : None Found. Restart Scanning.");
    cmdsStartScan();
  }
});

function cmdsConn(node) {
  node.connect(() => {
    node.discoverServices([cmdsBase.BaseUuid], (err, svcs) => {
      svcs.forEach((svc) => {
        if (svc.uuid !== cmdsBase.BaseUuid) {
          svc.discoverCharacteristics([], (err, chars) => {
            chars.forEach((char) => {
              var uuid = char.uuid.toUpperCase();
              cmdsBase.HeaderUuid === uuid ? cmdsCharHeader = char :
                cmdsBase.DataUuid === uuid ? cmdsCharData = char :
                  cmdsBase.ResultUuid === uuid ? cmdsCharResult = char : '';
            });

            if (cmdsCharHeader && cmdsCharData && cmdsCharResult) {
              console.log('Found Service, Characteristic');
              cmdsCharResult.on('data', (data, isNoti) => resultEmitter(data.readUInt8(0)));
              cmdsCharResult.subscribe(() => console.log("Notification Enabled!"));
            }
            else {
              console.log('missing characteristics');
            }
          })
        }
      })
    })
  })
}

function resultEmitter(resultCode) {
  switch (resultCode) {
    case cmdsBase.ResultType.IDLE:
      console.log("Status : IDLE");
      sendHeader();
      break;
    case cmdsBase.ResultType.HEADER:
      console.log("Status : HEADER");
      sendData();
      break;
    case cmdsBase.ResultType.DATA:
      console.log("Status : DATA");
      break;
    case cmdsBase.ResultType.INTERPRET:
      console.log("Status : INTERPRET");
      app.txP.processCount++;
      noble.emit('sendDone');
      break;
    case cmdsBase.ResultType.INTERPRET_ERROR:
      console.log("Status : INTERPRET_ERROR");
      //TODO: ERROR HANDLING. resultEmitter(cmdsBase.ResultType.IDLE);
      break;
    case cmdsBase.ResultType.ERROR:
      console.log("Status : ERROR");
      break;
    default:
      console.log("Status : UNKNOWN");
      break;
  }
}

function sendHeader() {
  var header = app.txP[app.txP.processCount].header;
  cmdsCharHeader.write(header, false, (err) =>
    (!err) ? console.log("Header Send Complete") : console.log(err)
  );
}

function sendData() {
  var data = app.txP[app.txP.processCount].data;
  cmdsCharData.write(data, false, (err) => {
    (!err) ? console.log("Data Send Complete") : console.log(err);
  });
}

module.exports.startScan = cmdsStartScan;
module.exports.cmdsConn = cmdsConn;
