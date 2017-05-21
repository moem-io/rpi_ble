var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var query = require('../../query');
var bleno = require('bleno');

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  var data = app.rxP[app.rxP.procCnt].data;

  switch (header.type) {
    case cmdsBase.BuildType.SCAN_RESPONSE:
      var len = pUtil.aData(data, 7);

      if (len) {
        for (var i = 0; i < len; i++) {
          var addr = pUtil.pData(data.toString('hex', i * 6, (i + 1) * 6), true, true);
          var rssi = -(data.readUInt8((i * 6) + 6));
          app.net.nodeCnt++; //TODO: nodeCnt Bug. Self Count (HUB)

          query.addNode(app.net.nodeCnt, header.src, addr, rssi); //TODO: Make it Promise.
        }
      }
      else
        cmdsBase.log("End Node. None Found");
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

  app.rxP.procCnt++;
  cmds.emit('interpretDone');
}

module.exports.run = interpretPacket;
