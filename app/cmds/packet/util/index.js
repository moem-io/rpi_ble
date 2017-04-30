var cmdsBase = require('../../cmds_base');

var buildHeader = function (h) {
  return new Buffer([h.type, h.idx, h.idxTot, h.src, h.srcSnsr, h.tgt, h.tgtSnsr]);
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
  var h = {
    type: opt.type,
    nodeAddr: opt.nodeAddr
  };

  switch (h.type) {
    case cmdsBase.BuildType.SCAN_REQUEST:
      return new Buffer(h.nodeAddr);
      break;

    default:
      break;
  }
};

module.exports.bHeader = buildHeader;
module.exports.pHeader = parseHeader;
module.exports.bData = buildData;
