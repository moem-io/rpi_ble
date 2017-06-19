const BaseUuid = '00009000000000108000001122334455';
const HeaderUuid = '00009001000000108000001122334455';
const Data1Uuid = '00009002000000108000001122334455';
const Data2Uuid = '00009003000000108000001122334455';
const ResultUuid = '00009004000000108000001122334455';

const scanTimeout = 1000;
const disconnectTimeout = 100;

const pathSize = 5;
const headerSize = 7 + pathSize;
const dataSize = 20;

const PktType = {
  SCAN_REQUEST: 1,
  SCAN_RESPONSE: 2,
  SENSOR_STATE_ATTACH: 3,
  SENSOR_STATE_DETACH: 4,
  SENSOR_DATA_REQUEST: 5,
  SENSOR_DATA_RESPONSE: 6,

  NODE_LED_REQUEST: 20,
  NODE_LED_RESPONSE: 21,

  NODE_BUTTON_PRESSED: 22,
  NODE_BUTTON_PRESSED_RESPONSE: 23,

  NET_PATH_UPDATE: 100,
  NET_PATH_UPDATE_RESPONSE: 101,

  NET_ACK_REQUEST: 102,
  NET_ACK_RESPONSE: 103,

  NET_JOIN_REQUEST: 104,
  NET_JOIN_RESPONSE: 105,

  SCAN_TARGET: 238,
  SCAN_TARGET_RESPONSE: 239
};

const RsltType = {
  IDLE: 0,
  HEADER: 1,
  DATA1: 2,
  DATA2: 3,
  INTERPRET: 4,
  INTERPRET_ERROR: 5,
  ERROR: 255
};

const ErrType = {
  SUCCESS: 0,
  TARGET_ERROR: 240,
  ROUTE_ERROR: 241
};

module.exports.BaseUuid = BaseUuid;
module.exports.HeaderUuid = HeaderUuid;
module.exports.Data1Uuid = Data1Uuid;
module.exports.Data2Uuid = Data2Uuid;
module.exports.ResultUuid = ResultUuid;

module.exports.scanTimeout = scanTimeout;
module.exports.disconnectTimeout = disconnectTimeout;

module.exports.PktType = PktType;
module.exports.RsltType = RsltType;
module.exports.ErrType = ErrType;

module.exports.pathSize = pathSize;
module.exports.headerSize = headerSize;
module.exports.dataSize = dataSize;
