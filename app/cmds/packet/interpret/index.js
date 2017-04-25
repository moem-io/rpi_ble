var cmdsBase = require('../../cmds-base');
var query = require('../../query');

function interpretPacket() {
  var header = appState.rxP[appState.rxP.processCount].header;
  var data = appState.rxP[appState.rxP.processCount].data;

  switch (header.readUInt8(0)) {
    case cmdsBase.BuildType.SCAN_RESPONSE:
      var source = header.readUInt8(3);

      if (!data.length) {
        for (var i = 0; i < data.length; i++) {
          var addr = data.toString('utf8', i, i + 5);
          var rssi = -(data.readUInt8(i + 6));

          query.addScanedNode(addr, rssi);
        }
      } else {
        console.error("Response None Found");
        //Todo: Error Handle.
      }
      break;

    case cmdsBase.BuildType.SENSOR_STATE_ATTACH:
      break;
    case cmdsBase.BuildType.SENSOR_STATE_DETACH:
      break;
    case cmdsBase.BuildType.SENSOR_DATA_RESPONSE:
      break;
    case cmdsBase.BuildType.NETWORK_ACK_RESPONSE:
      break;
    case cmdsBase.BuildType.NETWORK_JOIN_REQUEST:
      break;
    default:
      break;
  }

  appState.rxP.processCount++;
  bleno.emit('interpretDone');
}

module.exports.run = interpretPacket;
