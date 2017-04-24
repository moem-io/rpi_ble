"use strict";

var models = require("../../models");
var noble = require('noble');
var bleno = require('bleno');
var cmdsBase = require('../cmds-base');

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

noble.on('discover', (peripheral) => {
  console.log('found peripheral:', peripheral.advertisement.localName);
});

noble.on('scanStop', () => {
  Object.keys(noble._peripherals).forEach(
    (uuid) => {
      cmdsAddNode(noble._peripherals[uuid]);
      cmdsConn(noble._peripherals[uuid], sendHeader);
      noble._peripherals[uuid].on('disconnect', () => console.log('PERIPHERAL DISCONNECT CALLBACK'))
    }
  );
  console.log("Scan Stopped");
  if (appState.net.nodeCount === 0) {
    console.log("[Warning] : None Found. Restart Scanning.");
    cmdsStartScan();
  }
});

function cmdsAddNode(peripheral) {
  var p_addr = peripheral.address.replace(/:/g, '');
  appState.net.nodeCount++;
  appState.net.disc[p_addr] = peripheral;

  models.Nodes.create({
    nodeNo: appState.net.nodeCount,
    addr: p_addr
  }).then(
    (model) => models.Networks.create({
      parent: appState.dev.dbId,
      child: model.get('id'),
      rssi: peripheral.rssi
    })
  );
}

function cmdsStartScan() {
  noble.startScanning([cmdsBase.BaseUuid]);
  setTimeout(() => noble.stopScanning(), cmdsBase.scanTimeout);
}

function cmdsConn(peripheral, p_func) {
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
      break;
    case cmdsBase.ResultType.INTERPRET_ERROR:
      console.log("Status : INTERPRET_ERROR");
      // resultEmitter(cmdsBase.ResultType.IDLE);
      break;
    case cmdsBase.ResultType.ERROR:
      console.log("Status : ERROR");
      break;
    default:
      console.log("Status : UNKNOWN");
      break;
  }
}


function PrimaryService(options) {
  this.uuid = UuidUtil.removeDashes(options.uuid);
  this.characteristics = options.characteristics || [];
}

function packetHeader(opt) {
  var h = {
    type: opt.headerType,
    idx: opt.index,
    idxTot: opt.indexTotal,
    srcNode: opt.sourceNode,
    srcSensor: opt.sourceSensor,
    tgtNode: opt.targetNode,
    tgtSensor: opt.targetSensor
  };

  var newHeader = new Buffer([h.type, h.idx, h.idxTot, h.srcNode, h.srcSensor, h.tgtNode, h.tgtSensor]);

  return newHeader;
}

function packetBody(opt) {
  var newBody;
  var h = {
    type: opt.headerType,
    nodeAddr: opt.nodeAddr
  };

  switch (h.type) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      newBody = new Buffer(h.nodeId);
      break;
  }

  return newBody;
}

function buildPacket(headerType, arg) {
  var packet = {header: null, body: null};
  switch (headerType) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      packet.header = packetHeader({
        headerType: headerType,
        index: 1,
        indexTotal: 1,
        sourceNode: appState.dev.id,
        sourceSensor: 0,
        targetNode: arg.nodeId,
        targetSensor: 0
      });

      models.Nodes.findOne({where: {id: arg.nodeId}}).then((node) =>
        packet.body = packetBody({
          headerType: headerType,
          nodeAddr: node.addr
        })
      );
      break;

    case cmdsBase.BuildType.SENSOR_DATA_REQUEST:
      break;
    case cmdsBase.BuildType.NETWORK_ACK_REQUEST:
      break;
    case cmdsBase.BuildType.NETWORK_JOIN_REQUEST:
      break;
    default:
      break;
  }


  return null;
}

function buildData() {
  return Buffer([]);
}

function sendHeader() {
  var header = new Buffer([0x01, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00]);
  cmdsCharHeader.write(header, false, (err) =>
    (!err) ? console.log("Header Send Complete") : console.log(err)
  );
}

function sendData() {
  var data = new Buffer([0xE5, 0x57, 0xE9, 0x41, 0x7A, 0xE3]);
  cmdsCharData.write(data, false, (err) => {
    (!err) ? console.log("Data Send Complete") : console.log(err);
  });
}

function bakePizza() {
  //
  // Pick the crust.
  //
  var crust = new Buffer(1);
  crust.writeUInt8(pizza.PizzaCrust.THIN, 0);
  console.log(crust);

  pizzaCrustCharacteristic.write(crust, false, (err) => {
    if (!err) {
      //
      // Pick the toppings.
      //
      var toppings = new Buffer(2);
      toppings.writeUInt16BE(
        pizza.PizzaToppings.EXTRA_CHEESE |
        pizza.PizzaToppings.CANADIAN_BACON |
        pizza.PizzaToppings.PINEAPPLE,
        0
      );
      console.log(toppings);

      pizzaToppingsCharacteristic.write(toppings, false, function (err) {
        if (!err) {
          //
          // Subscribe to the bake notification, so we know when
          // our peripheral will be ready.
          //
          pizzaBakeCharacteristic.on('read', function (data, isNotification) {
            console.log('Our peripheral is ready!');
            if (data.length === 1) {
              var result = data.readUInt8(0);
              console.log('The result is',
                result === pizza.PizzaBakeResult.HALF_BAKED ? 'half baked.' :
                  result === pizza.PizzaBakeResult.BAKED ? 'baked.' :
                    result === pizza.PizzaBakeResult.CRISPY ? 'crispy.' :
                      result === pizza.PizzaBakeResult.BURNT ? 'burnt.' :
                        result === pizza.PizzaBakeResult.ON_FIRE ? 'on fire!' :
                          'unknown?');
            }
            else {
              console.log('result length incorrect')
            }
          });
          pizzaBakeCharacteristic.subscribe(function (err) {
            //
            // Bake at 450 degrees!
            //
            var temperature = new Buffer(2);
            temperature.writeUInt16BE(450, 0);
            pizzaBakeCharacteristic.write(temperature, false, function (err) {
              if (err) {
                console.log('bake error');
              }
            });
          });

        }
        else {
          console.log('toppings error');
        }
      });
    }
    else {
      console.log('crust error');
    }
  })
}

module.exports.startScan = cmdsStartScan;
