var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var query = require('../../query');
var bleno = require('bleno');

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  var data = app.rxP[app.rxP.procCnt].data;
  var proc = [];

  switch (header.type) {
    case cmdsBase.BuildType.SCAN_RESPONSE:
      app.net.responseCnt++;
      var len = pUtil.aData(data, 7);

      if (len) {
        for (var i = 0; i < len; i++) {
          var addr = pUtil.pData(data.toString('hex', i * 6, (i + 1) * 6), true, true);
          var rssi = -(data.readUInt8((i * 6) + 6));

          (addr !== app.dev.addr) ? app.net.nodeCnt++ : ''; //Block Counting Self.

          proc.push(query.addNode(app.net.nodeCnt, header.src, addr, rssi));
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

  return Promise.all(proc).then(() => {
    app.rxP.procCnt++;
    bleno.emit('interpretResult');
  });
}

module.exports.run = interpretPacket;
