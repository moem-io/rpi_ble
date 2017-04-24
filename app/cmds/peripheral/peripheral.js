var util = require('util');
var events = require('events');

function Cmds() {
  events.EventEmitter.call(this);
  this.toppings = 0;
  this.crust = 0;
}

util.inherits(Cmds, events.EventEmitter);

Cmds.prototype.bakeRslt = function (temperature) {
  var time = temperature * 10;
  var self = this;
  console.log('baking cmds at', temperature, 'degrees for', time, 'milliseconds');
  setTimeout(function () {
    var result = (temperature < 350) ? 0 : 4;
    self.emit('ready', result);
  }, time);
};

var bleno = require('bleno');

var CmdsService = require('./cmds-service');

var name = 'MxHUB';
var cmdsService = new CmdsService(new Cmds());

bleno.on('stateChange', (state) =>
  (state == 'poweredOn') ? bleno.startAdvertising(name, [cmdsService.uuid]) : bleno.stopAdvertising()
);

bleno.on('advertisingStart', () => bleno.setServices([cmdsService]));

bleno.on('servicesSet', () => console.log('SVC set. Advertising'));

function cmdsStartAdvertising() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
  console.log("Start Advertising");
}

module.exports.startAdvertising = cmdsStartAdvertising;
