var bleno = require('bleno');

var CmdsService = require('./cmds-service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));
bleno.on('advertisingStartError', () => cmdsStartAdvertise());

bleno.on('servicesSet', () => bleno.log('SVC set. Advertising'));
bleno.on('servicesSetError', () => cmdsStartAdvertise());

bleno.on('disconnect', () => {
  cmdsStartAdvertise();
  bleno.log('Central Disconnected. Re-advertising');
});


function cmdsStartAdvertise() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
}

module.exports.startAdvertise = cmdsStartAdvertise;

// bleno.on('stateChange', state => (state === 'poweredOn') ? cmdsStartAdvertise() : '');

