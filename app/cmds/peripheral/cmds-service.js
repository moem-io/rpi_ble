var util = require('util');
var bleno = require('bleno');
var CmdsBase = require('../cmds_base');
var CmdsChar = require('./cmds-char');

function CmdsService() {
  bleno.PrimaryService.call(this, {
    uuid: CmdsBase.BaseUuid.toLowerCase(),
    characteristics: [
      new CmdsChar.Header(),
      new CmdsChar.Data(),
      new CmdsChar.Result()
    ]
  });
  this.resultUpdateHandler = null;
}

util.inherits(CmdsService, bleno.PrimaryService);

module.exports = CmdsService;
