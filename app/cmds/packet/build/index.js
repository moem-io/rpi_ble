var query = require('../../query');
var pUtil = require('../../packet/util');
var cmdsBase = require("../../cmds_base");

function buildPacket(type, target) {
  if (target === app.dev.id) {
    var skip = cmds.log("Self Packet. Skipping");
    return Promise.all([skip]);
  }

  switch (type) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      var header = Promise.resolve(
        pUtil.bHeader({
          type: type,
          idx: 1,
          idxTot: 1,
          src: app.dev.id,
          srcSnsr: 0,
          tgt: target,
          tgtSnsr: 0
        }));

      var data = Promise.resolve(query.getNode({nodeNo: target})
        .then((node) => pUtil.bData({type: type, nodeAddr: node.addr})));
      break;

    case cmdsBase.BuildType.SENSOR_DATA_REQUEST:
      break;
    case cmdsBase.BuildType.NETWORK_ACK_REQUEST:
      break;
    case cmdsBase.BuildType.NETWORK_JOIN_REQUEST:
      break;
    default:
      break;
  }

  return Promise.all([header, data]).then((res) => {
      var packet = {header: res[0], data: res[1]};
    app.txP[app.txP.totalCnt] = packet;
    app.txP.totalCnt++;

      return true;
    }
  )
}

module.exports.run = buildPacket;
