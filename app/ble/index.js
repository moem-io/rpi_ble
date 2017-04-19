"use strict";

var models = require("../models");
var noble = require('noble');

const cmdsUuid = '0000A00000000010800000AABBCCDDEE';
const cmdsCharHeaderUuid = '0000A00100000010800000AABBCCDDEE';
const cmdsCharDataUuid = '0000A00200000010800000AABBCCDDEE';
const cmdsCharResultUuid = '0000A00300000010800000AABBCCDDEE';

const scanTimeout = 10000;

var appState = {};

var cmds = null;
var cmdsCharHeader = null;
var cmdsCharData = null;
var cmdsCharResult = null;

noble.on('stateChange',
  (state) => models.sql.sync().then(
    () => (state === 'poweredOn') ? cmdsStartScan() : noble.stopScanning()
  )
);

noble.on('discover', (peripheral) => {
  console.log('found peripheral:', peripheral.advertisement);
});

noble.on('scanStop', () => {
  Object.keys(noble._peripherals).forEach(
    (uuid) => cmdsAddNode(noble._peripherals[uuid])
  );
  console.log("scan Stopped");
});

/*cmdsConn(peripheral, b);*/

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
    }
  };

  models.Nodes.create({
    nodeNo: appState.net.nodeCount,
    addr: noble.address.replace(/:/g, '')
  }).then(
    (model) => appState.dev.dbId = model.get('id')
  );
}

function cmdsStartScan() {
  devicePreset();
  noble.startScanning([cmdsUuid]);
  setTimeout(() => noble.stopScanning(), scanTimeout);
}

function cmdsConn(peripheral, p_func) {
  peripheral.connect((err) => {

    peripheral.discoverServices([cmdsUuid], (err, svc) => {
      svc.forEach((svc) => {

        if (svc.uuid !== cmdsUuid) {
          svc.discoverCharacteristics([], (err, characteristics) => {
            characteristics.forEach((char) => {
              var uuid = char.uuid.toUpperCase();

              if (cmdsCharHeaderUuid == uuid) {
                cmdsCharHeader = char;
              }
              else if (cmdsCharDataUuid == uuid) {
                cmdsCharData = char;
              }
              else if (cmdsCharResultUuid == uuid) {
                cmdsCharResult = char;
              }
            });

            if (cmdsCharHeader && cmdsCharData && cmdsCharResult) {
              console.log('Found Service, Characteristic');
              p_func();
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

function bakePizza() {
  //
  // Pick the crust.
  //
  var crust = new Buffer(1);
  crust.writeUInt8(pizza.PizzaCrust.THIN, 0);
  console.log(crust);

  pizzaCrustCharacteristic.write(crust, false, function (err) {
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
          // our pizza will be ready.
          //
          pizzaBakeCharacteristic.on('read', function (data, isNotification) {
            console.log('Our pizza is ready!');
            if (data.length === 1) {
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
