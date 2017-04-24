var util = require('util');
var bleno = require('bleno');
var cmdsBase = require('./../cmds-base');

function CmdsHeaderChar(that) {
  this.cmds = that;
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.HeaderUuid,
    properties: ['read', 'write']
  });
}

function CmdsDataChar(that) {
  this.cmds = that;
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.DataUuid,
    properties: ['read', 'write']
  });
}

function CmdsResultChar(that) {
  this.cmds = that;
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.ResultUuid,
    properties: ['read', 'notify']
  });
}

util.inherits(CmdsHeaderChar, bleno.Characteristic);
util.inherits(CmdsDataChar, bleno.Characteristic);
util.inherits(CmdsResultChar, bleno.Characteristic);

function validateWrite(data, offset, callback, dataLength) {
  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG);
  }
  else if (data.length > dataLength) {
    callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
  }
}

CmdsHeaderChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 7);
  appState.rxP[appState.rxP.totalCount] = {header: data};
  appState.rxP.headerCount++;

  var resultCode = new Buffer([cmdsBase.ResultType.HEADER])

  this.cmds.resultUpdateHandler(resultCode);
  callback(this.RESULT_SUCCESS);
};

CmdsDataChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  appState.rxP[appState.rxP.totalCount] = {data: data};
  appState.rxP.dataCount++;

  if (appState.rxP.dataCount === appState.rxP.headerCount) {
    appState.rxP.totalCount++;
  }

  var resultCode = new Buffer([cmdsBase.ResultType.DATA])
  this.cmds.resultUpdateHandler(resultCode);

  resultCode = new Buffer([cmdsBase.ResultType.INTERPRET])
  this.cmds.resultUpdateHandler(resultCode);

  callback(this.RESULT_SUCCESS);
};

CmdsResultChar.prototype.onSubscribe = function (maxSize, updateValueCallback) {
  this.cmds.resultUpdateHandler = updateValueCallback;
  var resultCode = new Buffer([cmdsBase.ResultType.IDLE])
  this.cmds.resultUpdateHandler(resultCode);
};

module.exports.Header = CmdsHeaderChar;
module.exports.Data = CmdsDataChar;
module.exports.Result = CmdsResultChar;

