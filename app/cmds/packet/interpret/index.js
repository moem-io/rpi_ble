var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var pBuild = require('../build');
var query = require('../../query');
var bleno = require('bleno');

var build = [];
var chkNodeNo = undefined;

function interpretPacket() {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  var data = app.rxP[app.rxP.procCnt].data;
  var net = false;
  var proc = [];
  build = [];
  chkNodeNo = undefined;

  var errRes = errInterpret(header, data);
  if (errRes) {
    proc.push(errRes);
    net = true;
  } else {
    switch (header.type) {
      case cmdsBase.PktType.SCAN_RESPONSE:
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

      case cmdsBase.PktType.NODE_BTN_PRESSED:
        proc.push(dispatchQue(header.type, 0, {in_node: header.src, in_sensor: header.srcSnsr}));
        break;

      case cmdsBase.PktType.SNSR_DATA_RESPONSE: //TODO: data must parse in here.
        proc.push(dispatchQue(header.type, data, {in_node: header.src, in_sensor: header.srcSnsr}));
        break;

      case cmdsBase.PktType.NODE_LED_RESPONSE: //TODO: Maybe Log needed.
        cmds.log("LED ON!!");
        break;

      case cmdsBase.PktType.SNSR_STATE_ATTACH:
        break;
      case cmdsBase.PktType.SNSR_STATE_DETACH:
        break;

      case cmdsBase.PktType.SCAN_TARGET_RESPONSE:
        var addr = pUtil.pData(data.subarray(i * 7, (i + 1) * 7 - 1), true, true);
        var rssi = promiseRssi(data[(i + 1) * 7 - 1]);

        proc.push(query.getNode({nodeNo: header.src})
          .then(src => query.getNode({addr: addr})
            .then((tgt) => {
              chkNodeNo = tgt.nodeNo;
              return query.retrieveNetwork({parent: src.id, child: tgt.id})
            }).then(net => net.updateAttributes((!rssi) ? {isActive: 0} : {rssi: rssi}))));
        break;

      case cmdsBase.PktType.NET_ACK_RESPONSE:
        app.dev.ackCnt++;
        if (app.dev.ackTot === app.dev.ackCnt) {
          app.dev.ack = true;
          cmds.log("Ack Result! No, addr, depth, status, active");
          proc.push(query.ackResult());
        }
        break;
      case cmdsBase.PktType.NET_JOIN_REQUEST:
        break;
      default:
        break;
    }
  }

  return Promise.all(proc)
    .then(() => (net) ? query.addAllPath(app.net.nodeCnt) : '') //Update Path status
    .then(() => (chkNodeNo) ? nodeInactive(chkNodeNo) : '') //check Node if it's Active or Not.
    .then(() => (build.length > 0) ? Promise.all(build) : '')
    .then(() => {
      app.txP.send = false;
      app.rxP.procCnt++;
      bleno.emit('interpretResult');
    });
}

function nodeInactive(errNode) {
  return query.getNetworks({nodeNo: errNode, isActive: 1})
    .then(res => (res.length === 0) ? query.getNode({nodeNo: errNode})
      .then(node => node.updateAttributes({isActive: 0})) : '')
}

function errInterpret(header, data) {
  if (header.errType === cmdsBase.ErrType.SUCCESS)
    return;
  else {
    var src = data[0], tgt = data[2];

    switch (header.errType) {
      case cmdsBase.ErrType.TARGET_ERROR:
      case cmdsBase.ErrType.ROUTE_ERROR:
        chkNodeNo = tgt;//Promise might not have the same value.
        return dispatchQue(header.errType, 0, {src: src, tgt: tgt})
          .then(() => query.getNode({nodeNo: tgt}))
          .then((node) => query.getNetworks({nodeId: node.id}))
          .then((nets) => nets.forEach(
            net => {
              if (net.Parent.nodeNo === src && net.Child.nodeNo === tgt) { //Maybe Promise sequence broke??
                net.updateAttributes({isActive: 0}); //Update Network status => Path Update.
              } else {
                var tgtNode = (net.Parent.nodeNo === tgt) ? net.Child.nodeNo :
                  (net.Child.nodeNo === tgt) ? net.Parent.nodeNo : '';
                build.push(pBuild.run(cmdsBase.PktType.SCAN_TARGET, tgtNode, 0, {scanTgt: tgt}));
              }
            }));
        break;
    }
  }
}

function dispatchQue(type, data, opt) { //Maybe Async.
  var proc = [];
  var q_stack = [];

  switch (type) {
    case cmdsBase.PktType.NODE_BTN_PRESSED:
      proc.push(query.getNode({nodeNo: opt.in_node})
        .then(n => query.getAllApp({in_node: n.id, in_sensor: opt.in_sensor})
          .then(apps => {
            apps.forEach(app => q_stack.push({q_name: "app_" + app.app_id, q_msg: app.app_id + ',input,' + 1}));
            return q_stack;
          })));
      break;
    case cmdsBase.PktType.SNSR_DATA_RESPONSE:
      var appId = getAppIdFromReq(opt.in_node, opt.in_sensor);
      q_stack.push({q_name: "app_" + appId, q_msg: appId + ',input,' + data});
      break;
    case cmdsBase.ErrType.TARGET_ERROR:
    case cmdsBase.ErrType.ROUTE_ERROR:
      var msg = "네트워크에 에러가 발생하였습니다. 복구 중이니 잠시 후에 시도해 주세요.";
      proc.push(new Promise(resolve => {
        q_stack.push({q_name: "log_q", q_msg: msg + type + "," + opt.src + "->" + opt.tgt});
        resolve(q_stack);
      }));
      break;
  }

  return Promise.all(proc)
    .then((res) => res[0].forEach(r => rCh.sendToQueue(r.q_name, Buffer.from(r.q_msg))));
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
