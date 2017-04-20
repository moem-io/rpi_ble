var util = require('util');
var bleno = require('bleno');

var cmds = require('./cmds');
var CmdsService = require('./cmds-service');

var name = 'CmdsSquat';
var cmdsService = new CmdsService(new cmds.Cmds());

bleno.on('stateChange', (state) =>
  (state == 'poweredOn') ? bleno.startAdvertising(name, [cmdsService.uuid]) : bleno.stopAdvertising()
);

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));

bleno.on('servicesSet', () => console.log('SVC set. Advertising'));
