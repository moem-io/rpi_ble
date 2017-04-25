"use strict";

var noble = require('noble');
var cmdsBase = require('../cmds-base');
var query = require('../query');

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

function cmdsStartScan() {
  noble.startScanning([cmdsBase.BaseUuid]);
  setTimeout(() => noble.stopScanning(), cmdsBase.scanTimeout);
}

noble.on('discover', (peripheral) => {
  console.log('found peripheral:', peripheral.advertisement.localName);
});

noble.on('scanStop', () => {
  console.log("Scan Stopped");
  Object.keys(noble._peripherals).forEach((uuid) => {
    if (cmdsAddNode(noble._peripherals[uuid]))
      console.log("Node Add Success.");
  });
  
  if (appState.net.nodeCount === 0) {
    console.log("[Warning] : None Found. Restart Scanning.");
    cmdsStartScan();
  }
  else {
    noble.emit('sendReady');
  }
});

function cmdsAddNode(peripheral) {
  var addr = peripheral.address.replace(/:/g, '');
  appState.net.nodeCount++;
  appState.net.disc[appState.net.nodeCount] = peripheral;

  query.addScanedNode(addr, peripheral.rssi);
  //TODO : SCANNED NODE TESTING.
}


function cmdsConn(peripheral) {
  peripheral.connect(() => {
    peripheral.discoverServices([cmdsBase.BaseUuid], (svc) => {
      svc.forEach((svc) => {
        if (svc.uuid !== cmdsBase.BaseUuid) {
          svc.discoverCharacteristics([], (characteristics) => {
            characteristics.forEach((char) => {
              var uuid = char.uuid.toUpperCase();

              if (cmdsBase.HeaderUuid === uuid)
                cmdsCharHeader = char;
              else if (cmdsBase.DataUuid === uuid)
                cmdsCharData = char;
              else if (cmdsBase.ResultUuid === uuid)
                cmdsCharResult = char;
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
      appState.txP.processCount++;
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
  var header = appState.txP[appState.txP.processCount].header;
  cmdsCharHeader.write(header, false, (err) =>
    (!err) ? console.log("Header Send Complete") : console.log(err)
  );
}

function sendData() {
  var data = appState.txP[appState.txP.processCount].data;
  cmdsCharData.write(data, false, (err) => {
    (!err) ? console.log("Data Send Complete") : console.log(err);
  });
}

module.exports.startScan = cmdsStartScan;
module.exports.cmdsConn = cmdsConn;
