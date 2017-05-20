var util = require('util');
var bleno = require('bleno');
var CmdsBase = require('../cmds_base');
var CmdsChar = require('./cmds_char');

function CmdsService() {
  bleno.PrimaryService.call(this, {
    uuid: CmdsBase.BaseUuid,
    characteristics: [
      new CmdsChar.Header(),
      new CmdsChar.Data1(),
      new CmdsChar.Data2(),
      new CmdsChar.Result()
    ]
  });
}

util.inherits(CmdsService, bleno.PrimaryService);

module.exports = CmdsService;
