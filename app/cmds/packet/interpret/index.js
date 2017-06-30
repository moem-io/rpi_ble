var cmdsBase = require('../../cmds_base');
var pUtil = require('../../packet/util');
var pBuild = require('../build');
var query = require('../../query');
var bleno = require('bleno');
var network = require('../../network');

var build = [];
var chkNodeNo = undefined;

var sensorType = {
  'B': "[버튼]", 'H': "[사람인식]", 'S': "[소리]", 'R': "[LED]", 'I': "[IR]",
  'Z': "[버저]", 'T': "[온습도]", 'P': "[압력]", 'L': "[조도]"
};

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

        for (var i = 0; i < len; i++) {
          var addr = pUtil.pData(data.subarray(i * 7, (i + 1) * 7 - 1), true, true);
          var rssi = promiseRssi(data[(i + 1) * 7 - 1]);

          proc.push(onScanRes(addr, header, rssi));
        }
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

      case cmdsBase.PktType.SNSR_STATE_REQUEST:
        var state = (data[0] !== 0) ? "부착되었습니다." : "떨어졌습니다.";
        var msg = sensorType[data[0]] + header.src + "번 노드의 " + header.srcSnsr + "번 센서가 " + state;
        build.push(query.addLogData(msg, header.src, header.srcSnsr));
        build.push(promisePBuild(cmdsBase.PktType.SNSR_STATE_RESPONSE, header.src, 0));
        break;

      case cmdsBase.PktType.SCAN_TARGET_RESPONSE:
        var addr = pUtil.pData(data.subarray(0, 6), true, true);
        var rssi = promiseRssi(data[6]);

        proc.push(updateNetwork(header, addr, rssi));
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
    .then(() => (net) ? network.calcPath() : '') //Update Path status
    .then(() => (chkNodeNo) ? nodeInactive(chkNodeNo) : '') //check Node if it's Active or Not.
    .then(() => network.calcPath()) //Update Path status
    .then(() => {
        if (build.length > 0) {
          return Promise.all(build).then(() => {
            app.txP.send = false;
            app.rxP.procCnt++;
            bleno.emit('interpretResult');
          });
        }
        app.txP.send = false;
        app.rxP.procCnt++;
        bleno.emit('interpretResult');
      }
    );
}


function errInterpret(header, data) {
  var src = data[0], tgt = data[2];

  switch (header.errType) {
    case cmdsBase.ErrType.TARGET_ERROR:
    case cmdsBase.ErrType.ROUTE_ERROR:
      chkNodeNo = tgt;//Promise might not have the same value.
      return dispatchQue(header.errType, 0, {src: src, tgt: tgt})
        .then(() => query.getNetsByNode({nodeNo: tgt, isActive: 1}))
        .then((nets) => nets.forEach(
          net => { //Update Network status => Path Update. (Sequence must be F
            if (net.Parent.nodeNo === src && net.Child.nodeNo === tgt) { //Maybe Promise sequence broke??
              return query.updateNetwork({isActive: 0, netId: net.id}).then(() => network.calcPath(false));
            } else {
              var tgtNode = (net.Parent.nodeNo === tgt) ? net.Child.nodeNo :
                (net.Child.nodeNo === tgt) ? net.Parent.nodeNo : '';
              build.push(promisePBuild(cmdsBase.PktType.SCAN_TARGET, tgtNode, tgt));
            }
          }));
  }
}

function dispatchQue(type, data, opt) { //Maybe Async.
  var proc = [];
  var q_stack = [];

  switch (type) {
    case cmdsBase.PktType.NODE_BTN_PRESSED:
      proc.push(query.getAppsByNode({nodeNo: opt.in_node, in_sensor: opt.in_sensor})
        .then(apps => {
          apps.forEach(app => q_stack.push({q_name: "app_" + app.app_id, q_msg: app.app_id + ',input,' + 1}));
          return q_stack;
        }));
      return Promise.all(proc)
        .then((res) => res[0].forEach(r => rCh.sendToQueue(r.q_name, Buffer.from(r.q_msg))));
      break;

    case cmdsBase.PktType.SNSR_DATA_RESPONSE:////////////////////////////////////////////////////////////////////
      var appId = getAppIdFromReq(opt.in_node, opt.in_sensor);
      q_stack.push({q_name: "app_" + appId, q_msg: appId + ',input,' + data});
      return Promise.all([]);
      break;

    case cmdsBase.ErrType.TARGET_ERROR:
    case cmdsBase.ErrType.ROUTE_ERROR:
      var msg = "네트워크에 에러가 발생하였습니다. 복구 중이니 잠시 후에 시도해 주세요." + opt.src + "->" + opt.tgt + "노드";
      build.push(query.addLogData(msg));
      return Promise.all([]);
      break;
  }
}

function nodeInactive(errNode) {
  return query.getNetsByNode({nodeNo: errNode, isActive: 1})
    .then(res => (res.length === 0) ?
      Promise.all([query.updateNode({nodeNo: errNode, isActive: 0}),
        query.updatePath({nodeNo: errNode, isActive: 0})]) : ''
    );
}

//For Promising Data values, while in async.
var promiseRssi = (rssi) => -(rssi);

var promisePBuild = (type, tgtNode, tgt) => new Promise(resolve => {
  setTimeout(() => resolve(pBuild.run(type, tgtNode, 0, {scanTgt: tgt})), tgtNode * 500) //Random Timeout;
});

function updateNetwork(header, addr, rssi) {
  return query.getNode({nodeNo: header.src}).then(src =>
    query.getNode({addr: addr}).then((tgt) => {
      chkNodeNo = tgt.nodeNo;
      return query.retrieveNetwork({parent: src.id, child: tgt.id})
        .then((net) => net[0].updateAttributes((!rssi) ? {isActive: 0} : {rssi: rssi}))
    }))
}

//If None found, add Counter & Node
function onScanRes(addr, header, rssi) {
  return query.getNode({addr: addr})
    .catch(Sql.EmptyResultError, () => app.net.nodeCnt++)
    .then(() => query.addNode(app.net.nodeCnt, header.src, addr, rssi));
}
module.exports.run = interpretPacket;
