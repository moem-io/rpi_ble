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
  (offset) ? callback(this.RESULT_ATTR_NOT_LONG) :
    (data.length > dataLength) ? callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH) : '';
}

CmdsHeaderChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 7);
  app.rxP[app.rxP.totalCount] = {header: data};
  //TODO : ERROR CHECK IF OBJECT IS NOT INITIALIZED.
  app.rxP.headerCount++;

  var resultCode = new Buffer([cmdsBase.ResultType.HEADER])

  this.cmds.resultUpdateHandler(resultCode);
  callback(this.RESULT_SUCCESS);
};

CmdsDataChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  app.rxP[app.rxP.totalCount] = {data: data};
  app.rxP.dataCount++;

  if (app.rxP.dataCount === app.rxP.headerCount) {
    app.rxP.totalCount++;


    var resultCode = new Buffer([cmdsBase.ResultType.DATA]);
    this.cmds.resultUpdateHandler(resultCode);

    bleno.emit('interpretReady');

    bleno.on('interpretDone', () => {
      resultCode = new Buffer([cmdsBase.ResultType.INTERPRET]);
      console.error("this Error?");
      //TODO: this object?
      this.cmds.resultUpdateHandler(resultCode);
    });

    callback(this.RESULT_SUCCESS);
  } else {
    resultCode = new Buffer([cmdsBase.ResultType.ERROR]);
    this.cmds.resultUpdateHandler(resultCode);

    //TODO: ERROR HANDLING.
    callback(this.RESULT_UNLIKELY_ERROR);
  }
};

CmdsResultChar.prototype.onSubscribe = function (maxSize, updateValueCallback) {
  this.cmds.resultUpdateHandler = updateValueCallback;
  var resultCode = new Buffer([cmdsBase.ResultType.IDLE])
  this.cmds.resultUpdateHandler(resultCode);
};

module.exports.Header = CmdsHeaderChar;
module.exports.Data = CmdsDataChar;
module.exports.Result = CmdsResultChar;

