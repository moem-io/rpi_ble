var bleno = require('bleno');

var CmdsService = require('./cmds-service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));
bleno.on('advertisingStartError', () => cmdsStartAdvertise());

bleno.on('servicesSet', () => console.log('SVC set. Advertising'));
bleno.on('servicesSetError', () => cmdsStartAdvertise());

bleno.on('accept', () => {
  bleno.stopAdvertising();
  console.log("Central Connected, Stop Advertising.")
});

bleno.on('disconnect', () => cmdsStartAdvertise());


function cmdsStartAdvertise() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
  console.log("Start Advertising");
}

module.exports.startAdvertise = cmdsStartAdvertise;

// bleno.on('stateChange', state => (state === 'poweredOn') ? cmdsStartAdvertise() : '');

