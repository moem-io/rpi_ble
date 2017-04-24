var util = require('util');
var bleno = require('bleno');
var CmdsBase = require('./../cmds-base');
var CmdsChar = require('./cmds-char');

function CmdsService() {
  bleno.PrimaryService.call(this, {
    uuid: CmdsBase.BaseUuid,
    characteristics: [
      new CmdsChar.Header(this),
      new CmdsChar.Data(this),
      new CmdsChar.Result(this)
    ]
  });
  this.resultUpdateHandler = null;
}

util.inherits(CmdsService, bleno.PrimaryService);

module.exports = CmdsService;
