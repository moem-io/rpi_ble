var util = require('util');
var bleno = require('bleno');
var cmdsBase = require('../cmds_base');
var pUtil = require('../packet/util');

function CmdsHeaderChar() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.HeaderUuid,
    properties: ['read', 'write', 'writeWithoutResponse']
  });
}

function CmdsData1Char() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.Data1Uuid,
    properties: ['read', 'write', 'writeWithoutResponse']
  });
}

function CmdsData2Char() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.Data2Uuid,
    properties: ['read', 'write', 'writeWithoutResponse']
  });
}

function CmdsResultChar() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.ResultUuid,
    properties: ['read', 'write', 'writeWithoutResponse', 'notify']
  });
}

var resUpdate = null;

util.inherits(CmdsHeaderChar, bleno.Characteristic);
util.inherits(CmdsData1Char, bleno.Characteristic);
util.inherits(CmdsData2Char, bleno.Characteristic);
util.inherits(CmdsResultChar, bleno.Characteristic);

function validateWrite(data, offset, callback, dataLength) {
  (offset) ? callback(this.RESULT_ATTR_NOT_LONG) :
    (data.length > dataLength) ? callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH) : '';
}

CmdsHeaderChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 7);
  bleno.log("Header Added");
  app.rxP[app.rxP.totalCnt] = {header: data, data: null};
  app.rxP.headerCnt++;

  resultUpdate(cmdsBase.ResultType.HEADER);
};

CmdsData1Char.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  bleno.log("Data1 Added");
  app.rxP[app.rxP.totalCnt].data = data;
  bleno.log("Data 1 : " + pUtil.pData(app.rxP[app.rxP.totalCnt].data, 0, true));
  resultUpdate(cmdsBase.ResultType.DATA1, callback);
  dataCount(1);
};

CmdsData2Char.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  bleno.log("Data2 Added");
  var tmp = app.rxP[app.rxP.totalCnt].data;
  app.rxP[app.rxP.totalCnt].data = tmp + data;
  bleno.log("Data 2 : " + app.rxP[app.rxP.totalCnt].data);
  resultUpdate(cmdsBase.ResultType.DATA2, callback);
  dataCount(2);
};

CmdsResultChar.prototype.onSubscribe = function (maxSize, updateValueCallback) {
  bleno.log("Subscribe Complete");
  resUpdate = updateValueCallback;
  resultUpdate(cmdsBase.ResultType.IDLE);
};

bleno.on('interpretResult', () => resultUpdate(cmdsBase.ResultType.INTERPRET));

var dataCount = (cnt) => {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  (header.idxTot === cnt) ? interpretEmit() : '';
};

var interpretEmit = () => {
  app.rxP.dataCnt++;
  app.rxP.totalCnt++;
  cmds.emit('interpretReady');
};

var resultUpdate = (resType, callback) => {
  resUpdate(Buffer.from([resType]));
  (callback) ? callback(this.RESULT_SUCCESS) : '';
};

var errHandler = () => {
  resultUpdate(cmdsBase.ResultType.ERROR);
  //TODO: ERROR HANDLING.
  callback(this.RESULT_UNLIKELY_ERROR);
};

module.exports.Header = CmdsHeaderChar;
module.exports.Data1 = CmdsData1Char;
module.exports.Data2 = CmdsData2Char;
module.exports.Result = CmdsResultChar;

