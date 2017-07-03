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
  SCAN_REQ: 1,
  SCAN_RES: 2,
  SNSR_STAT_REQ: 3, //Sensor Attach? Sent by Node
  SNSR_STAT_RES: 4,
  SNSR_DATA_REQ: 5, //Sensor Data Request from Hub. ex)Humid && Temp
  SNSR_DATA_RES: 6,
  SNSR_ACT_REQ: 7, //Sensor Activity from Node. ex) Button
  SNSR_ACT_RES: 8,
  SNSR_CMD_REQ: 9, //Sensor Command request from Hub. ex)Buzzor, IR
  SNSR_CMD_RES: 10,

  NODE_STAT_REQ: 17, //Node Battery Status.
  NODE_STAT_RES: 18, //TODO: Not Implemented
  NODE_LED_REQ: 19,
  NODE_LED_RES: 20,
  NODE_BTN_PRESS_REQ: 21,
  NODE_BTN_PRESS_RES: 22,

  NET_UPDATE_REQ: 101, //Net ID Update.
  NET_UPDATE_RES: 102, //
  NET_ACK_REQ: 103, //Net Ack. If Node Alive?
  NET_ACK_RES: 104, //TODO: Not Implemented
  NET_JOIN_REQ: 105, //Net JOIN.b
  NET_JOIN_RES: 106, //TODO: Not Implemented

  SCAN_TGT_REQ: 238, //IF TGT is connectable?
  SCAN_TGT_RES: 239
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

const sensorType = {
  '0': "", 'T': "[온습도]", 'R': "[LED]", 'I': "[IR]", 'Z': "[버저]",
  'B': "[버튼]", 'S': "[소리]", 'H': "[사람인식]", 'P': "[압력]", 'L': "[조도]"
};

//sensor_q(T) DATA_request
//node_q, led_q(R), remote_q(I), buzzer_q(Z) CMD_request

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
module.exports.sensorType = sensorType;

module.exports.pathSize = pathSize;
module.exports.headerSize = headerSize;
module.exports.dataSize = dataSize;
