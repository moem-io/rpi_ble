const BaseUuid = '00009000000000108000001122334455';
const HeaderUuid = '00009001000000108000001122334455';
const Data1Uuid = '00009002000000108000001122334455';
const Data2Uuid = '00009003000000108000001122334455';
const ResultUuid = '00009004000000108000001122334455';

const scanTimeout = 5000;
const disconnectTimeout = 100;

const PacketType = {
  SCAN_REQUEST: 1,
  SCAN_RESPONSE: 2,
  SENSOR_STATE_ATTACH: 3,
  SENSOR_STATE_DETACH: 4,
  SENSOR_DATA_REQUEST: 5,
  SENSOR_DATA_RESPONSE: 6,

  NET_PATH_UPDATE: 100,
  NET_PATH_UPDATE_RESPONSE: 101,
  
  NET_ACK_REQUEST: 102,
  NET_ACK_RESPONSE: 103,

  NET_JOIN_REQUEST: 104,
  NET_JOIN_RESPONSE: 105
};

const BuildType = {
  SCAN_REQUEST: 1,
  SCAN_RESPONSE: 2,
  PACKET_ROUTE: 3
};

const ResultType = {
  IDLE: 0,
  HEADER: 1,
  DATA1: 2,
  DATA2: 3,
  INTERPRET: 4,
  INTERPRET_ERROR: 5,
  ERROR: 255
};

module.exports.BaseUuid = BaseUuid;
module.exports.HeaderUuid = HeaderUuid;
module.exports.Data1Uuid = Data1Uuid;
module.exports.Data2Uuid = Data2Uuid;
module.exports.ResultUuid = ResultUuid;

module.exports.scanTimeout = scanTimeout;
module.exports.disconnectTimeout = disconnectTimeout;

module.exports.PacketType = PacketType;
module.exports.BuildType = BuildType;
module.exports.ResultType = ResultType;
