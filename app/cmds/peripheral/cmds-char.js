var util = require('util');
var bleno = require('bleno');
var cmdsBase = require('./../cmds-base');

function CmdsHeaderChar(cmds) {
  this.cmds = cmds;
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.HeaderUuid,
    properties: ['read', 'write']
  });
}

function CmdsDataChar(cmds) {
  this.cmds = cmds;
  bleno.Characteristic.call(this, {
    uuid: cmdsBase.DataUuid,
    properties: ['read', 'write']
  });
}

function CmdsResultChar(cmds) {
  this.cmds = cmds;
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
  var crust = data.readUInt8(0);
  console.log(crust);
  switch (crust) {
    case cmds.CmdsHeader.THIN:
      this.cmds.crust = crust;
      callback(this.RESULT_SUCCESS);
      break;
    default:
      callback(this.RESULT_UNLIKELY_ERROR);
      break;
  }
};

CmdsDataChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  validateWrite(data, offset, callback, 20);
  this.cmds.toppings = data.readUInt16BE(0);
  callback(this.RESULT_SUCCESS);
};

CmdsResultChar.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG);
  }
  else if (data.length !== 2) {
    callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
  }
  else {
    var temperature = data.readUInt16BE(0);
    var self = this;
    this.cmds.once('ready', function (result) {
      if (self.updateValueCallback) {
        var data = new Buffer(1);
        data.writeUInt8(result, 0);
        self.updateValueCallback(data);
      }
    });
    this.cmds.bakeRslt(temperature);
    callback(this.RESULT_SUCCESS);
  }
};

module.exports.Header = CmdsHeaderChar;
module.exports.Data = CmdsDataChar;
module.exports.Result = CmdsResultChar;

