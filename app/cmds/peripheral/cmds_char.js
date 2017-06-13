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

  resultUpdate(cmdsBase.RsltType.HEADER);
};

CmdsData1Char.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  bleno.log("Data 1 Added");
  app.rxP[app.rxP.totalCnt].data = data;
  bleno.log("Data 1 : " + pUtil.pData(app.rxP[app.rxP.totalCnt].data, 0, true));
  resultUpdate(cmdsBase.RsltType.DATA1, callback);
  dataCount(1);
};

CmdsData2Char.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  bleno.log("Data 2 Added");
  var tmp = new Uint8Array(app.rxP[app.rxP.totalCnt].data.length + 20);
  tmp.set(app.rxP[app.rxP.totalCnt].data, 0);
  tmp.set(data, app.rxP[app.rxP.totalCnt].data.length);

  app.rxP[app.rxP.totalCnt].data = tmp;
  bleno.log("Data 2 : " + pUtil.pData(app.rxP[app.rxP.totalCnt].data, 0, true));

  resultUpdate(cmdsBase.RsltType.DATA2, callback);
  dataCount(2);
};

CmdsResultChar.prototype.onSubscribe = function (maxSize, updateValueCallback) {
  bleno.log("Subscribe Complete");
  resUpdate = updateValueCallback;
  resultUpdate(cmdsBase.RsltType.IDLE);
};

bleno.on('interpretResult', () => {
  bleno.log('Dispatching Interpret Result. Waiting for Disconnection.');
  resultUpdate(cmdsBase.RsltType.INTERPRET);
  cmds.emit('interpretDone');
});

var dataCount = (cnt) => {
  var header = pUtil.pHeader(app.rxP[app.rxP.procCnt].header);
  (header.idxTot === cnt) ? interpretEmit() : bleno.log("Data " + header.idxTot + " " + cnt);
};

var interpretEmit = () => {
  app.rxP.dataCnt++;
  app.rxP.totalCnt++;
  cmds.emit('interpret');
};

var resultUpdate = (resType, callback) => {
  resUpdate(Buffer.from([resType]));
  (callback) ? callback(this.RESULT_SUCCESS) : '';
};

var errHandler = () => {
  resultUpdate(cmdsBase.RsltType.ERROR);
  //TODO: ERROR HANDLING.
  callback(this.RESULT_UNLIKELY_ERROR);
};

module.exports.Header = CmdsHeaderChar;
module.exports.Data1 = CmdsData1Char;
module.exports.Data2 = CmdsData2Char;
module.exports.Result = CmdsResultChar;

