var util = require('util');
var bleno = require('bleno');
var cmdsBase = require('../cmds_base');

function CmdsHeaderChar() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.HeaderUuid.toLowerCase(),
    properties: ['read', 'write', 'writeWithoutResponse']
  });
}

function CmdsDataChar() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.DataUuid.toLowerCase(),
    properties: ['read', 'write', 'writeWithoutResponse']
  });
}

function CmdsResultChar() {
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.ResultUuid.toLowerCase(),
    properties: ['read', 'write', 'notify']
  });
}

var resUpdate = null;

util.inherits(CmdsHeaderChar, bleno.Characteristic);
util.inherits(CmdsDataChar, bleno.Characteristic);
util.inherits(CmdsResultChar, bleno.Characteristic);

function validateWrite(data, offset, callback, dataLength) {
  (offset) ? callback(this.RESULT_ATTR_NOT_LONG) :
    (data.length > dataLength) ? callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH) : '';
}

CmdsHeaderChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 7);
  bleno.log("Header Added");
  app.rxP[app.rxP.totalCount] = {header: data, data: null};
  app.rxP.headerCount++;

  resultUpdate(cmdsBase.ResultType.HEADER);
  callback(this.RESULT_SUCCESS);
};

CmdsDataChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  bleno.log("Data Added");
  app.rxP[app.rxP.totalCount].data = data;
  app.rxP.dataCount++;

  if (app.rxP.dataCount === app.rxP.headerCount) {
    app.rxP.totalCount++;

    resultUpdate(cmdsBase.ResultType.DATA);
    callback(this.RESULT_SUCCESS);
    bleno.emit('interpretReady');
  } else {
    resultUpdate(cmdsBase.ResultType.ERROR);
    //TODO: ERROR HANDLING.
    callback(this.RESULT_UNLIKELY_ERROR);
  }
};

CmdsResultChar.prototype.onSubscribe = function (maxSize, updateValueCallback) {
  bleno.log("Subscribe Complete");
  resUpdate = updateValueCallback;
  resultUpdate(cmdsBase.ResultType.IDLE);
};

bleno.on('interpretResult', () => {
  resultUpdate(cmdsBase.ResultType.INTERPRET);
  setTimeout(() => bleno.disconnect(), cmdsBase.disconnectTimeout);
});

var resultUpdate = (resType) => resUpdate(Buffer.from([resType]));

module.exports.Header = CmdsHeaderChar;
module.exports.Data = CmdsDataChar;
module.exports.Result = CmdsResultChar;

