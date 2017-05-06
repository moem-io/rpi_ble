var bleno = require('bleno');

var CmdsService = require('./cmds-service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));
bleno.on('advertisingStartError', () => cmdsStartAdvertise());

bleno.on('servicesSet', () => bleno.log('SVC set. Advertising'));
bleno.on('servicesSetError', () => cmdsStartAdvertise());

bleno.on('accept', () => {
  bleno.stopAdvertising();
  bleno.log("Central Connected, Stop Advertising.");
});

bleno.on('disconnect', () => {
  bleno.log('Central Disconnected. Re-advertising');
  cmdsStartAdvertise();
});


function cmdsStartAdvertise() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
  bleno.log("Start Advertising");
}

module.exports.startAdvertise = cmdsStartAdvertise;

// bleno.on('stateChange', state => (state === 'poweredOn') ? cmdsStartAdvertise() : '');

