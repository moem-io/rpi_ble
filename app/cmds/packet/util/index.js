var cmdsBase = require('../../cmds_base');

var buildHeader = function (h) {
  return Buffer.from([h.type, h.idx, h.idxTot, h.src, h.srcSnsr, h.tgt, h.tgtSnsr]);
};

var parseHeader = function (h) {
  return {
    type: h.readUInt8(0),
    idx: h.readUInt8(1),
    idxTot: h.readUInt8(2),
    src: h.readUInt8(3),
    srcSnsr: h.readUInt8(4),
    tgt: h.readUInt8(5),
    tgtSnsr: h.readUInt8(6)
  }
};

var buildData = function (opt) {
  switch (opt.type) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      var buf = Buffer.from(parseData(opt.nodeAddr, true));
      break;

    default:
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
    return buf
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
