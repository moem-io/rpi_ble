var query = require('../../query');
var pUtil = require('../../packet/util');
var cmdsBase = require("../../cmds_base");
var _ = require('lodash');

function buildPacket(type, target, targetSnsr, opt) {
  if (target === app.dev.id) {
    cmds.log("Self Packet. Skipping");
    return Promise.resolve();
  }

  var header, data;

  switch (type) {
    case cmdsBase.PktType.SCAN_REQUEST:
      header = pUtil.bHeader({type: type, tgt: target, tgtSnsr: 0});
      data = tgtAddrByNo(type, target);
      break;

    case cmdsBase.PktType.NET_ACK_REQUEST:
      header = headerWithPath(type, target);
      data = tgtAddrByNo(type, target);
      break;

    case cmdsBase.PktType.SCAN_TARGET://Maybe Promsise Problem Occur
      header = headerWithPath(type, target);
      data = tgtAddrByNo(type, opt.scanTgt);
      break;

    case cmdsBase.PktType.NODE_LED_REQUEST:
      header = headerWithPath(type, target);
      data = pUtil.bData(type, {ledString: opt.ledString});
      break;

    case cmdsBase.PktType.SNSR_STATE_RESPONSE:
      header = headerWithPath(type, target);
      data = pUtil.bData(type, 0);
      break;

    case cmdsBase.PktType.SNSR_DATA_REQUEST:
      header = headerWithPath(type, target, targetSnsr);
      break;


    case cmdsBase.PktType.NET_UPDATE_REQUEST:
      header = headerWithPath2(type, target);
      data = nodeAddrWithId().then(data => pUtil.bData(type, {nodeData: data}));
      break;

    case cmdsBase.PktType.NET_JOIN_REQUEST:
      break;

    default:
      break;
  }

  return Promise.all([Promise.resolve(header), Promise.resolve(data)]).then((res) => {
    app.txP[app.txP.totalCnt] = {header: res[0], data: res[1]};
    console.log("======================", app.txP.totalCnt, "============================");
    console.log("header: ", res[0], " data: ", res[1]);
    app.txP.totalCnt++;
      return true;
    }
  )
}

var tgtAddrByNo = function (type, tgt) {
  return query.getNode({nodeNo: tgt}).then((node) => pUtil.bData(type, {nodeAddr: node.addr}));
};

var headerWithPath = function (type, tgt, tgtSnsr = 0) {
  return query.getPath({nodeNo: tgt})
    .then(res => pUtil.bHeader({type: type, tgt: tgt, tgtSnsr: tgtSnsr}, res.path.split('-')));
};

var headerWithPath2 = function (type, tgt, tgtSnsr = 0) {
  return query.getPath({nodeNo: tgt})
    .then(res => query.getAllNode()
      .then(nodes => pUtil.bHeader({
        type: type,
        idxTot: Math.ceil((nodes.length - 1) * 7 / 20),
        tgt: tgt,
        tgtSnsr: tgtSnsr
      }, res.path.split('-'))));
};


var nodeAddrWithId = function () {
  return query.getAllNode().then(nodes => {
    var nodeData = [];
    nodes.forEach(node => {
      if (node.nodeNo === app.dev.id) return;
      var tmp = pUtil.pData(node.addr, true);
      delete tmp.length;

      var tmpArr = _.values(tmp).concat(node.nodeNo);
      nodeData = nodeData.concat(tmpArr);
    });
    return nodeData;

  })
};

module.exports.run = buildPacket;
