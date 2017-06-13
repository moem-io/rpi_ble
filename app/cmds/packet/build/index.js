var query = require('../../query');
var pUtil = require('../../packet/util');
var cmdsBase = require("../../cmds_base");

function buildPacket(type, target, opt) {
  if (target === app.dev.id) {
    cmds.log("Self Packet. Skipping");
    return Promise.resolve();
  }

  var header, data;

  switch (type) {
    case cmdsBase.PktType.SCAN_REQUEST:
    case cmdsBase.PktType.NET_ACK_REQUEST:
      header = pUtil.bHeader({type: type, tgt: target, tgtSnsr: 0});

      data = query.getNode({nodeNo: target})
        .then((node) => pUtil.bData({type: type, nodeAddr: node.addr}));
      break;

    case cmdsBase.PktType.NODE_LED_REQUEST:
      header = pUtil.bHeader({type: type, tgt: target, tgtSnsr: 0});

      data = pUtil.bData({type: type, ledString: opt.ledString});
      break;

    case cmdsBase.PktType.SENSOR_DATA_REQUEST:
      break;

    case cmdsBase.PktType.NET_JOIN_REQUEST:
      break;
    default:
      break;
  }

  return Promise.all([Promise.resolve(header), Promise.resolve(data)]).then((res) => {
    app.txP[app.txP.totalCnt] = {header: res[0], data: res[1]};
    app.txP.totalCnt++;
      return true;
    }
  )
}

module.exports.run = buildPacket;
