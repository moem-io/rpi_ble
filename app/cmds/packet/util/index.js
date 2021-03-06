var cmdsBase = require('../../cmds_base');

var buildHeader = function (h, path = []) { //path Type must be Array
  var type = h.type;

  var errType = h.errType || cmdsBase.ErrType.SUCCESS;
  var idxTot = h.idxTot || 1;
  var src = h.src || app.dev.id;
  var srcSnsr = h.srcSnsr || 0;

  var tgt = h.tgt;
  var tgtSnsr = h.tgtSnsr;

  var tmpPath = path.concat([tgt]).concat(new Array(cmdsBase.pathSize - (path.length + 1)).fill(0));

  return Buffer.from([type, errType, idxTot, src, srcSnsr, tgt, tgtSnsr].concat(tmpPath));
};

var parseHeader = function (h) {
  return {
    type: h.readUInt8(0),
    errType: h.readUInt8(1),
    idxTot: h.readUInt8(2),
    src: h.readUInt8(3),
    srcSnsr: h.readUInt8(4),
    tgt: h.readUInt8(5),
    tgtSnsr: h.readUInt8(6),
    path: {0: h.readUInt8(7), 1: h.readUInt8(8), 2: h.readUInt8(9), 3: h.readUInt8(10), 4: h.readUInt8(11)}
  }
};

var buildData = function (type, opt) {
  var buf = null;
  switch (type) {
    case cmdsBase.PktType.SCAN_REQ:
    case cmdsBase.PktType.NET_ACK_REQ:
    case cmdsBase.PktType.SCAN_TGT_REQ:
      buf = Buffer.from(parseData(opt.nodeAddr, true));
      break;

    case cmdsBase.PktType.NODE_LED_REQ:
      buf = Buffer.from(opt.ledString);
      break;

    case cmdsBase.PktType.NODE_BTN_PRESS_RES: //TODO: deprecated
    case cmdsBase.PktType.SNSR_STAT_RES:
    case cmdsBase.PktType.SNSR_ACT_RES:
    case cmdsBase.PktType.SNSR_DATA_REQ:
      buf = Buffer.from([1]);
      break;

    case cmdsBase.PktType.SNSR_CMD_REQ:
      buf = Buffer.from(opt.cmd);
      break;

    case cmdsBase.PktType.NET_UPDATE_REQ:
      buf = Buffer.from(opt.nodeData);
      break;

  }

  return buf;
};

var parseData = function (data, rev = false, str = false) {
  var buf = {};
  buf.length = Math.ceil(data.length / 2);
  var bufIdx = 0;

  if (str) {
    var tmpBuf = new Buffer(data);
    var tmp = tmpBuf.toString('hex');

    return (!rev) ? tmp : tmp.match(/.{2}/g).reverse().join('');
  }
  else {
    for (var i = 0; i < data.length; i += 2) {
      buf[(!rev) ? bufIdx : buf.length - bufIdx - 1] = "0x" + data[i] + data[i + 1];
      bufIdx++;
    }
    return buf;
  }
};

var analyzeData = function (data, len) {
  var dataLen = Math.floor(data.length / len);
  var i = 0;

  for (i; i < dataLen; i++) {
    var tmp1 = Buffer.from(data.slice(i * len, (i + 1) * len));
    var tmp2 = Buffer.alloc(len);
    if (!Buffer.compare(tmp1, tmp2))
      break;
  }

  return i;
};

module.exports.bHeader = buildHeader;
module.exports.pHeader = parseHeader;
module.exports.bData = buildData;

module.exports.pData = parseData;
module.exports.aData = analyzeData;
