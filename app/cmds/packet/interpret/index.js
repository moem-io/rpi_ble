var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var query = require('../../query');

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.processCount].header);
  var data = app.rxP[app.rxP.processCount].data;

  switch (header.type) {
    case cmdsBase.BuildType.SCAN_RESPONSE:
      if (!data.length) {
        for (var i = 0; i < data.length; i++) {
          var addr = data.toString('utf8', i, i + 5); //TODO: uppercase?
          var rssi = -(data.readUInt8(i + 6));
          app.net.nodeCount++;

          query.addNode(app.net.nodeCount, header.src, addr, rssi);
        }
      } else {
        console.log("End Node. None Found");
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

  app.rxP.processCount++;
  bleno.emit('interpretDone');
}

module.exports.run = interpretPacket;
