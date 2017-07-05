var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var pBuild = require('../build');
var query = require('../../query');
var bleno = require('bleno');
var network = require('../../network');

var build = [];
var chkNodeNo = undefined;

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  var data = app.rxP[app.rxP.procCnt].data;
  var net = false;
  let proc = [];
  build = [];
  chkNodeNo = undefined;

  var errRes = errInterpret(header, data);
  if (errRes) {
    proc.push(errRes);
    net = true;
  } else {
    switch (header.type) {
      case cmdsBase.PktType.SCAN_RES:
        net = true;
        app.net.responseCnt++;
        var len = pUtil.aData(data, 7);
        var pQue = [];

        for (var i = 0; i < len; i++) {
          var addr = pUtil.pData(data.subarray(i * 7, (i + 1) * 7 - 1), true, true);
          var rssi = promiseRssi(data[(i + 1) * 7 - 1]);
          pQue.push([addr, header, rssi]);
        }

        proc.push(pQue.reduce((prev, que) => prev.then(() => onScanRes(que[0], que[1], que[2])), Promise.resolve(1)));
        break;

      case cmdsBase.PktType.NET_ACK_RES:
        app.dev.ackCnt++;
        if (app.dev.ackTot === app.dev.ackCnt) {
          app.dev.ack = true;
          cmds.log("Ack Result! No, addr, depth, status, active");
          proc.push(query.ackResult());
        }//todo: not Tested.
        break;

      case cmdsBase.PktType.SCAN_TGT_RES:
        var addr = pUtil.pData(data.subarray(0, 6), true, true);
        var rssi = promiseRssi(data[6]);

        proc.push(updateNet(header, addr, rssi));
        break;

      case cmdsBase.PktType.NODE_LED_RES: //TODO: Maybe Log needed.
        cmds.log("LED ON!!");
        break;

      case cmdsBase.PktType.NODE_BTN_PRESS_REQ: //TODO: deprecated
        proc.push(dispatchQue(header.type, 1, {in_node: header.src, in_sensor: header.srcSnsr}));
        build.push(promisePBuild(cmdsBase.PktType.NODE_BTN_PRESS_RES, header.src, header.srcSnsr, 0));
        break;

      case cmdsBase.PktType.SNSR_STAT_REQ:
        var state = (data[0] !== 0) ? "부착되었습니다." : "떨어졌습니다.";
        var msg = cmdsBase.sensorType[data[0]] + header.src + "번 노드의 " + header.srcSnsr + "번 센서가 " + state;
        proc.push(query.retrieveSnsr(header.src, header.srcSnsr, cmdsBase.sensorType[data[0]], (data[0] === 0) ? 0 : 1));
        proc.push(query.addLogData(msg, header.src, header.srcSnsr));
        build.push(promisePBuild(cmdsBase.PktType.SNSR_STAT_RES, header.src, header.srcSnsr, 0));
        break;

/////////////////////////////////////////////////////////////////////////////////////////////
      case cmdsBase.PktType.SNSR_ACT_REQ: //TODO: Not Tested. Might Prob with data Length. (data Parse)
        proc.push(dispatchQue(header.type, data, {in_node: header.src, in_sensor: header.srcSnsr}));
        build.push(promisePBuild(cmdsBase.PktType.SNSR_ACT_RES, header.src, header.srcSnsr, 0));
        break; //todo: not Implemented

      case cmdsBase.PktType.SNSR_DATA_RES: //TODO: Not Tested. Might Prob with data Length. (data Parse)
        proc.push(dispatchQue(header.type, data, {in_node: header.src, in_sensor: header.srcSnsr}));
        break;

      case cmdsBase.PktType.SNSR_CMD_RES:
        cmds.log("CMD COMPLETE!!");
        break;

/////////////////////////////////////////////////////////////////////////////////////////////

      case cmdsBase.PktType.NET_JOIN_REQ:
        break;

      default:
        break;
    }
  }

  return Promise.all(proc)
    .then(() => (net) ? network.calcPath() : '') //Update Path status
    .then(() => (chkNodeNo) ? nodeInactive(chkNodeNo) : '') //check Node if it's Active or Not.
    .then(() => network.calcPath()) //Update Path status
    .then(() => (build.length > 0) ? Promise.all(build).then(() => interpretRes()) : interpretRes());
}

var interpretRes = function () {
  app.txP.send = false;
  app.rxP.procCnt++;
  bleno.emit('interpretResult');
};

function errInterpret(header, data) {
  var src = data[0], tgt = data[2];

  switch (header.errType) {
    case cmdsBase.ErrType.TARGET_ERROR:
    case cmdsBase.ErrType.ROUTE_ERROR:
      chkNodeNo = tgt;//Promise might not have the same value.

      return dispatchQue(header.errType, 0, {src: src, tgt: tgt})
        .then(() => query.getNetsByNode({nodeNo: tgt, isActive: 1}))
        .then((nets) => {
          var proc = [];
          nets.forEach(net => { //Update Network status => Path Update. (Sequence must be Promise.
            if (net.Parent.nodeNo === src && net.Child.nodeNo === tgt) {
              proc.push(query.updateNet({isActive: 0, netId: net.id}).then(() => network.calcPath(false)));
            } else {
              var tgtNode = (net.Parent.nodeNo === tgt) ? net.Child.nodeNo :
                (net.Child.nodeNo === tgt) ? net.Parent.nodeNo : '';
              build.push(promisePBuild(cmdsBase.PktType.SCAN_TGT_REQ, tgtNode, 0, {scanTgt: tgt}));
            }
          });
          return proc;
        }).then(proc => (proc.length > 0) ? Promise.all(proc) : '');
  }
}

var isNotNull = function (val) { //TODO: Move to PktUtil
  return val !== 0;
};

function dispatchQue(type, data, opt) {
  var proc = [];
  var q_stack = [];

  switch (type) {
    case cmdsBase.PktType.SNSR_ACT_REQ: //TODO: Not Tested
    case cmdsBase.PktType.NODE_BTN_PRESS_REQ: //TODO: deprecated
      console.log(opt.in_node, opt.in_sensor);
      var parseData = data.filter(isNotNull);
      proc.push(query.getAllApp({in_node: opt.in_node, in_sensor: opt.in_sensor})
        .then(apps => {
          apps.forEach(app => q_stack.push({q_name: "app_" + app.app_id, q_msg: app.app_id + ',input,' + parseData}));
          return q_stack;
        }));
      return Promise.all(proc).then((res) => res[0].forEach(r => rCh.sendToQueue(r.q_name, Buffer.from(r.q_msg))));

    case cmdsBase.PktType.SNSR_DATA_RES://TODO: Test. Proper Que?
      var appId = getAppIdFromQue(opt.in_node, opt.in_sensor);
      q_stack.push({q_name: "app_" + appId, q_msg: appId + ',input,' + data});
      return Promise.all([rCh.sendToQueue(r.q_name, Buffer.from(r.q_msg))]);

    case cmdsBase.ErrType.TARGET_ERROR:
    case cmdsBase.ErrType.ROUTE_ERROR:
      var msg = "네트워크에 에러가 발생하였습니다. 복구 중이니 잠시 후에 시도해 주세요." + opt.src + "->" + opt.tgt + "노드";
      proc.push(query.addLogData(msg));
      return Promise.all(proc);
  }

}

//For Promising Data values, while in async.
var promiseRssi = (rssi) => -(rssi);

var promisePBuild = (type, tgtNode, tgtSnsr, opt) => new Promise(resolve => {
  setTimeout(() => resolve(pBuild.run(type, tgtNode, tgtSnsr, opt)), tgtNode * 500); //Random Timeout;
});

//If None found, add Counter & Node
function onScanRes(addr, header, rssi) {
  var nodeNo = app.net.nodeCnt;
  return query.getNode({addr: addr})
    .catch(Sql.EmptyResultError, () => {
      app.net.nodeCnt++;
      nodeNo++;
    }).then(() => query.addNode(nodeNo, header.src, addr, rssi));
}

//Inactive or Update RSSI.
function updateNet(header, addr, rssi) {
  return query.getNode({nodeNo: header.src}).then(src =>
    query.getNode({addr: addr}).then((tgt) => {
      chkNodeNo = tgt.nodeNo;
      return query.retrieveNet({parent: src.id, child: tgt.id})
        .then((net) => net[0].updateAttributes((!rssi) ? {isActive: 0} : {rssi: rssi}))
    }))
}

//if No Network, Inactive Row, Path.
var nodeInactive = function (errNode) {
  return query.getNetsByNode({nodeNo: errNode, isActive: 1})
    .then(res => (res.length === 0) ?
      Promise.all([query.updateNode({nodeNo: errNode, isActive: 0}),
        query.updatePathByNode({nodeNo: errNode, isActive: 0})]) : ''
    );
};

module.exports.run = interpretPacket;
