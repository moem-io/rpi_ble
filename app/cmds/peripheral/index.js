var bleno = require('bleno');

var CmdsService = require('./cmds_service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', (err) => {
  bleno.log('on -> advertisingStart: ' + (err ? err : 'success'));
  (!err) ? bleno.setServices([cmdsService], (e) => bleno.log('setServices: ' + (e ? e : 'success')))  : '';
});

bleno.on('disconnect', () => {
  cmdsStartAdvertise();
  bleno.log('Central Disconnected. Re-advertising');
});


function cmdsStartAdvertise() {
  bleno.startAdvertising(name, [cmdsService.uuid]);
}

module.exports.startAdvertise = cmdsStartAdvertise;

// bleno.on('stateChange', state => (state === 'poweredOn') ? cmdsStartAdvertise() : '');

