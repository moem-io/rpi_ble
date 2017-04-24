var util = require('util');
var events = require('events');
var bleno = require('bleno');

var CmdsService = require('./cmds-service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));

bleno.on('servicesSet', () => console.log('SVC set. Advertising'));

bleno.on('disconnect', () => cmdsStartAdvertising());

function cmdsStartAdvertising() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
  console.log("Start Advertising");
}

module.exports.startAdvertising = cmdsStartAdvertising;
