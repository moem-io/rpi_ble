var bleno = require('bleno');

var CmdsService = require('./cmds_service');

var name = 'MxHUB';
var cmdsService = new CmdsService();

bleno.on('advertisingStart', (err) => {
  bleno.log('advertisingStart: ' + (err ? err : 'success'));
  (!err) ? bleno.setServices([cmdsService], (e) => bleno.log('setServices: ' + (e ? e : 'success')))  : '';
});

bleno.on('disconnect', () => {
  cmds.emit('pStandBy');
  bleno.log('Central Disconnected. Re-advertising');
});

bleno.on('accept', () => {
  if (!cmds.cConn()) {
    bleno.stopAdvertising();
    bleno.log("Central Connected, Stop Advertising.");
  }
});

function cmdsStartAdvertise() {
  bleno.startAdvertising(name, []);
}

module.exports.startAdvertise = cmdsStartAdvertise;

// bleno.on('stateChange', state => (state === 'poweredOn') ? cmdsStartAdvertise() : '');

