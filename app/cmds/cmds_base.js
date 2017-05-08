const BaseUuid = '00009000000000108000001122334455';
const HeaderUuid = '00009001000000108000001122334455';
const DataUuid = '00009002000000108000001122334455';
const ResultUuid = '00009003000000108000001122334455';

const scanTimeout = 5000;
const disconnectTimeout = 100;

const PacketType = {
  SCAN_REQUEST: 1,
  SCAN_RESPONSE: 2,
  SENSOR_STATE_ATTACH: 3,
  SENSOR_STATE_DETACH: 4,
  SENSOR_DATA_REQUEST: 5,
  SENSOR_DATA_RESPONSE: 6,

  NETWORK_ACK_REQUEST: 100,
  NETWORK_ACK_RESPONSE: 101,

  NETWORK_JOIN_REQUEST: 102,
  NETWORK_JOIN_RESPONSE: 103
};

const BuildType = {
  SCAN_REQUEST: 1,
  SCAN_RESPONSE: 2,
  PACKET_ROUTE: 3
};

const ResultType = {
  IDLE: 0,
  HEADER: 1,
  DATA: 2,
  INTERPRET: 3,
  INTERPRET_ERROR: 4,
  ERROR: 255
};

module.exports.BaseUuid = BaseUuid;
module.exports.HeaderUuid = HeaderUuid;
module.exports.DataUuid = DataUuid;
module.exports.ResultUuid = ResultUuid;

module.exports.scanTimeout = scanTimeout;
module.exports.disconnectTimeout = disconnectTimeout;

module.exports.PacketType = PacketType;
module.exports.BuildType = BuildType;
module.exports.ResultType = ResultType;
