var models = require("../models");

function packetHeader(opt) {
  var h = {
    type: opt.headerType,
    idx: opt.index,
    idxTot: opt.indexTotal,
    srcNode: opt.sourceNode,
    srcSensor: opt.sourceSensor,
    tgtNode: opt.targetNode,
    tgtSensor: opt.targetSensor
  };

  var newHeader = new Buffer([h.type, h.idx, h.idxTot, h.srcNode, h.srcSensor, h.tgtNode, h.tgtSensor]);

  return newHeader;
}

function packetBody(opt) {
  var newBody;
  var h = {
    type: opt.headerType,
    nodeAddr: opt.nodeAddr
  };

  switch (h.type) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      newBody = new Buffer(h.nodeId);
      break;
  }

  return newBody;
}

function buildPacket(headerType, arg) {
  var packet = {header: null, data: null};
  switch (headerType) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      packet.header = packetHeader({
        headerType: headerType,
        index: 1,
        indexTotal: 1,
        sourceNode: appState.dev.id,
        sourceSensor: 0,
        targetNode: arg.nodeNo,
        targetSensor: 0
      });

      models.Nodes.findOne({where: {nodeNo: arg.nodeNo}}).then((node) =>
        packet.data = packetBody({
          headerType: headerType,
          nodeAddr: node.addr
        })
      );
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

  appState.txP[appState.txP.totalCount] = packet;
  appState.txP.totalCount++;
}

module.exports.run = buildPacket;
