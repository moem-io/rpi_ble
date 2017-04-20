"use strict";

var models = require("../../models");
var noble = require('noble');
var bleno = require('bleno');
var cmdsBase = require('../cmds-base');

const scanTimeout = 1000;

var appState = {};

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

noble.on('stateChange', (state) => {
  models.sql.sync().then(() =>
    (state == 'poweredOn') ? cmdsStartScan() : noble.stopScanning()
  )
});

noble.on('discover', (peripheral) => {
  console.log('found peripheral:', peripheral.advertisement.localName);
});

noble.on('scanStop', () => {
  Object.keys(noble._peripherals).forEach(
    (uuid) => {
      cmdsAddNode(noble._peripherals[uuid]);
      cmdsConn(noble._peripherals[uuid], sendHeader);
    }
  );
  console.log("Scan Stopped");
  if (appState.net.nodeCount == 0) {
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
    rxP: {},
    txP: {}
  };

  models.Nodes.create({
    nodeNo: appState.net.nodeCount,
    addr: noble.address.replace(/:/g, '')
  }).then(
    (model) => appState.dev.dbId = model.get('id')
  );
}

function cmdsStartScan() {
  if (Object.keys(appState).length == 0) {
    devicePreset()
  }
  noble.startScanning([cmdsBase.BaseUuid]);
  setTimeout(() => noble.stopScanning(), scanTimeout);
}

function cmdsConn(peripheral, p_func) {
  peripheral.connect((err) => {

    peripheral.discoverServices([cmdsBase.BaseUuid], (err, svc) => {
      svc.forEach((svc) => {

        if (svc.uuid !== cmdsBase.BaseUuid) {
          svc.discoverCharacteristics([], (err, characteristics) => {
            characteristics.forEach((char) => {
              var uuid = char.uuid.toUpperCase();

              if (cmdsBase.HeaderUuid == uuid) {
                cmdsCharHeader = char;
              }
              else if (cmdsBase.DataUuid == uuid) {
                cmdsCharData = char;
              }
              else if (cmdsBase.ResultUuid == uuid) {
                cmdsCharResult = char;
              }
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
    case cmdsBase.CmdsResult.IDLE:
      console.log("Status : IDLE");
      sendHeader();
      break;
    case cmdsBase.CmdsResult.HEADER:
      console.log("Status : HEADER");
      sendData();
      break;
    case cmdsBase.CmdsResult.DATA:
      console.log("Status : DATA");
      break;
    case cmdsBase.CmdsResult.INTERPRET:
      console.log("Status : INTERPRET");
      break;
    case cmdsBase.CmdsResult.INTERPRET_ERROR:
      console.log("Status : INTERPRET_ERROR");
      // resultEmitter(cmdsBase.CmdsResult.IDLE);
      break;
    case cmdsBase.CmdsResult.ERROR:
      console.log("Status : ERROR");
      break;
    default:
      console.log("Status : UNKNOWN");
      break;
  }
}

function sendHeader() {
  var header = new Buffer([0x01, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00]);
  cmdsCharHeader.write(header, false, (err) =>
    (!err) ? console.log("Header Send Complete") : console.log(err)
  );
}

function sendData() {
  var data = new Buffer([0x01, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00]);
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
            if (data.length == 1) {
              var result = data.readUInt8(0);
              console.log('The result is',
                result == pizza.PizzaBakeResult.HALF_BAKED ? 'half baked.' :
                  result == pizza.PizzaBakeResult.BAKED ? 'baked.' :
                    result == pizza.PizzaBakeResult.CRISPY ? 'crispy.' :
                      result == pizza.PizzaBakeResult.BURNT ? 'burnt.' :
                        result == pizza.PizzaBakeResult.ON_FIRE ? 'on fire!' :
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

module.exports = noble;
