"use strict";

var noble = require('noble');
var query = require('../query');
var cmdsBase = require('../cmds_base');

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

function cmdsStartScan() {
  noble.startScanning([cmdsBase.BaseUuid.toLowerCase()]);
  setTimeout(() => noble.stopScanning(), cmdsBase.scanTimeout);
}

noble.on('discover', node => noble.log('found node:' + node.advertisement.localName));

noble.on('scanStop', () => {
  noble.log("Scan Stopped");
  var nodes = Object.keys(noble._peripherals);

  if (nodes.length) {
    Promise.all(nodes.map((uuid) => {
      var node = noble._peripherals[uuid];
      var nodeAddr = node.address.replace(/:/g, '');

      app.net.nodeCount++;
      app.net.disc[nodeAddr] = node;

      return query.addNode(app.net.nodeCount, app.dev.id, nodeAddr, node.rssi)
    })).then(() => noble.emit('sendReady'));
  } else {
    noble.log("[Warning] : None Found. Restart Scanning.");
    cmdsStartScan();
  }
});

function cmdsConn(node) {
  node.once('disconnect', () => noble.log("Peripheral Disconnected"));
  node.connect((err) => {
    node.discoverServices([cmdsBase.BaseUuid,cmdsBase.BaseUuid.toLowerCase()], (err, svcs) => {
      svcs.forEach((svc) => {
        if (svc.uuid.toUpperCase() === cmdsBase.BaseUuid) {
          svc.discoverCharacteristics([], (err, chars) => {
            chars.forEach((char) => {
              var uuid = char.uuid.toUpperCase();
              cmdsBase.HeaderUuid === uuid ? cmdsCharHeader = char :
                cmdsBase.DataUuid === uuid ? cmdsCharData = char :
                  cmdsBase.ResultUuid === uuid ? cmdsCharResult = char : '';
            });

            if (cmdsCharHeader && cmdsCharData && cmdsCharResult) {
              noble.log('Found Service, Characteristic');
              cmdsCharResult.on('data', (data, isNoti) => resultEmitter(data.readUInt8(0)));
              cmdsCharResult.subscribe(() => noble.log("Notification Enabled!"));
            }
            else {
              noble.log('missing characteristics');
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
      noble.log("Status : IDLE");
      sendHeader();
      break;
    case cmdsBase.ResultType.HEADER:
      noble.log("Status : HEADER");
      sendData();
      break;
    case cmdsBase.ResultType.DATA:
      noble.log("Status : DATA");
      break;
    case cmdsBase.ResultType.INTERPRET:
      noble.log("Status : INTERPRET");
      app.txP.processCount++;
      noble.emit('sendDone');
      break;
    case cmdsBase.ResultType.INTERPRET_ERROR:
      noble.log("Status : INTERPRET_ERROR");
      //TODO: ERROR HANDLING. resultEmitter(cmdsBase.ResultType.IDLE);
      break;
    case cmdsBase.ResultType.ERROR:
      noble.log("Status : ERROR");
      break;
    default:
      noble.log("Status : UNKNOWN");
      break;
  }
}

function sendHeader() {
  var header = app.txP[app.txP.processCount].header;
  cmdsCharHeader.write(header, false, (err) =>
    (!err) ? noble.log("Header Send Complete") : noble.log(err)
  );
}

function sendData() {
  var data = app.txP[app.txP.processCount].data;
  cmdsCharData.write(data, false, (err) => {
    (!err) ? noble.log("Data Send Complete") : noble.log(err);
  });
}

module.exports.startScan = cmdsStartScan;
module.exports.cmdsConn = cmdsConn;
