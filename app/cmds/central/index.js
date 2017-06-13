"use strict";

var noble = require('noble');
var query = require('../query');
var cmdsBase = require('../cmds_base');
var _ = require('lodash');

var target = null;
var cmdsCharHeader = null;
var cmdsCharData1 = null;
var cmdsCharData2 = null;
var cmdsCharResult = null;
function cmdsStartScan() {
  noble.startScanning([cmdsBase.BaseUuid], true);
  setTimeout(() => noble.stopScanning(), cmdsBase.scanTimeout);
}

noble.on('discover', node => {
  var rssi = -Math.abs(node.rssi);
  (!node.rssiBase) ? node.rssiBase = rssi : node.rssiBase += rssi;
  (!node.rssiCnt) ? node.rssiCnt = 1 : node.rssiCnt += 1;
  noble.log(node.advertisement.localName + ' rssi:' + rssi + ' cnt:' + node.rssiCnt + ' base:' + node.rssiBase + " RSSI:" + Math.round(node.rssiBase / node.rssiCnt));
});

noble.on('scanStop', () => {
  noble.log("Scan Stopped");
  var nodes = Object.keys(noble._peripherals);
  var cnt = 0;

  if (nodes.length) {
    if (!app.dev.init && app.net.set && !app.dev.ack) {   //Re-Started Sequence. search pre-discovered Depth-1 device.
      Promise.all(nodes.map((uuid) => {
        var node = noble._peripherals[uuid];
        var addr = node.address.replace(/:/g, '');

        if (_.has(app.net.disc, addr)) {
          cmds.log("Depth-1 Node Found : " + addr);
          app.net.disc[addr] = node;
          cnt++;
        }

      })).then(() => (cnt) ? cmds.emit('netAck') : restartScan()) //after Scanned, Build Ack Packet.
    } else {
      Promise.all(nodes.map((uuid) => {
        var node = noble._peripherals[uuid];
        var nodeAddr = node.address.replace(/:/g, '');

        app.net.nodeCnt++;
        app.net.disc[nodeAddr] = node;

        return query.addNode(app.net.nodeCnt, app.dev.id, nodeAddr, Math.round(node.rssiBase / node.rssiCnt))
      })).then(() => cmds.emit('cSend'))
    }
  }
  else {
    restartScan();
  }
});

function restartScan() {
  noble.log("[Warning] : None Found. Restart Scanning.");
  cmdsStartScan();
}

function cmdsConn(node) {
  target = node;
  node.connect((err) => {
    noble.log("Connecting to " + node.address);
    node.discoverServices([cmdsBase.BaseUuid, cmdsBase.BaseUuid.toLowerCase()], (err, svcs) => {
      svcs.forEach((svc) => {
        if (svc.uuid.toUpperCase() === cmdsBase.BaseUuid) {
          svc.discoverCharacteristics([], (err, chars) => {
            chars.forEach((char) => {
              var uuid = char.uuid.toUpperCase();
              cmdsBase.HeaderUuid === uuid ? cmdsCharHeader = char :
                cmdsBase.Data1Uuid === uuid ? cmdsCharData1 = char :
                  cmdsBase.Data2Uuid === uuid ? cmdsCharData2 = char :
                    cmdsBase.ResultUuid === uuid ? cmdsCharResult = char : '';
            });

            if (cmdsCharHeader && cmdsCharData1 && cmdsCharData2 && cmdsCharResult) {
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
    case cmdsBase.RsltType.IDLE:
      noble.log("Status : IDLE");
      sendHeader();
      break;
    case cmdsBase.RsltType.HEADER:
      noble.log("Status : HEADER");
      sendData1();
      break;
    case cmdsBase.RsltType.DATA1:
      noble.log("Status : DATA 1");
      sendData2();
      break;
    case cmdsBase.RsltType.DATA2:
      noble.log("Status : DATA 2");
      break;
    case cmdsBase.RsltType.INTERPRET:
      noble.log("Status : INTERPRET");
      app.txP.procCnt++;
      target.disconnect(() => {
        noble.log("Target Disconnected");
        target = null;
        cmds.emit('cSendDone');
      });
      break;
    case cmdsBase.RsltType.INTERPRET_ERROR:
      noble.log("Status : INTERPRET_ERROR");
      //TODO: ERROR HANDLING. resultEmitter(cmdsBase.RsltType.IDLE);
      break;
    case cmdsBase.RsltType.ERROR:
      noble.log("Status : ERROR");
      break;
    default:
      noble.log("Status : UNKNOWN");
      break;
  }
}

function sendHeader() {
  var header = app.txP[app.txP.procCnt].header;
  cmdsCharHeader.write(header, false, err => sendLog(err, "Header"));
}

function sendData1() {
  var data = app.txP[app.txP.procCnt].data;
  cmdsCharData1.write(data.slice(0, 20), false, err => sendLog(err, "Data 1"));
}

function sendData2() {
  var data = app.txP[app.txP.procCnt].data;
  (data.length > 20) ? cmdsCharData2.write(data.slice(20, 40), false, err => sendLog(err, "Data 2")) : '';
}

var sendLog = (err, msg) => (!err) ? noble.log(msg + " Send Complete") : noble.log(err);

module.exports.startScan = cmdsStartScan;
module.exports.cmdsConn = cmdsConn;
