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
  SNSR_STATE_ATTACH: 3, //
  SNSR_STATE_DETACH: 4, //
  SNSR_DATA_REQUEST: 5, //
  SNSR_DATA_RESPONSE: 6, //
  SNSR_ACTIVITY_REQUEST: 7, //
  SNSR_ACTIVITY_RESPONSE: 8, //
  SNSR_CMD_REQUEST: 9, //
  SNSR_CMD_RESPONSE: 10, //

  NODE_STATUS_REQUEST: 17, //
  NODE_STATUS_RESPONSE: 18, //
  NODE_LED_REQUEST: 19,
  NODE_LED_RESPONSE: 20,
  NODE_BTN_PRESSED: 21,
  NODE_BTN_PRESSED_RESPONSE: 22,

  NET_PATH_UPDATE: 101, //
  NET_PATH_UPDATE_RESPONSE: 102,//
  NET_ACK_REQUEST: 103, //
  NET_ACK_RESPONSE: 104, //
  NET_JOIN_REQUEST: 105, //
  NET_JOIN_RESPONSE: 106, //

  SCAN_TARGET: 238,
  SCAN_TARGET_RESPONSE: 239
};

const ErrType = {
  SUCCESS: 0,
  TARGET_ERROR: 240,
  ROUTE_ERROR: 241
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
