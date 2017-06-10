var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var query = require('../../query');
var bleno = require('bleno');

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  var data = app.rxP[app.rxP.procCnt].data;
  var net = false;
  var proc = [];

  switch (header.type) {
    case cmdsBase.PacketType.SCAN_RESPONSE:
      net = true;
      app.net.responseCnt++;
      var len = pUtil.aData(data, 7);

      if (len) {
        for (var i = 0; i < len; i++) {
          var addr = pUtil.pData(data.subarray(i * 7, (i + 1) * 7 - 1), true, true);
          var rssi = promiseRssi(data[(i + 1) * 7 - 1]);

          proc.push(onScanRes(addr, header, rssi));
        }
      }
      else
        cmds.log("End Node. None Found");
      break;

    case cmdsBase.PacketType.NODE_BUTTON_PRESSED:
      proc.push(promiseQueue({in_node: header.src, in_sensor: header.srcSnsr}));
      break;

    case cmdsBase.PacketType.NODE_LED_RESPONSE:
      cmds.log("LED ON!!");
      break;

    case cmdsBase.PacketType.SENSOR_STATE_ATTACH:
      break;
    case cmdsBase.PacketType.SENSOR_STATE_DETACH:
      break;
    case cmdsBase.PacketType.SENSOR_DATA_RESPONSE:
      break;
    case cmdsBase.PacketType.NETWORK_ACK_RESPONSE:
      break;
    case cmdsBase.PacketType.NETWORK_JOIN_REQUEST:
      break;
    default:
      break;
  }

  return Promise.all(proc)
    .then(() => (net) ? query.addAllPath(app.net.nodeCnt) : '')
    .then(() => {
      app.rxP.procCnt++;
      bleno.emit('interpretResult');
    });
}

function promiseQueue(opt) {
  //TODO : Node NO (ID) Doesn't match.
  return query.getAllApp({in_node: opt.in_node, in_sensor: opt.in_sensor})
    .then(apps => {
      apps.forEach(
        app => rabbitCh.sendToQueue('btn_q', Buffer.from(app.app_id + ',input,' + 1))
      );
      return true;
    });
}

//For Promising Data values, while in async.
function promiseRssi(rssi) {
  return -(rssi);
}

function onScanRes(addr, header, rssi) {
  return query.getNode({addr: addr})
    .catch(Sql.EmptyResultError, () => app.net.nodeCnt++)
    .then(() => query.addNode(app.net.nodeCnt, header.src, addr, rssi));
}
module.exports.run = interpretPacket;
