var util = require('util');
var bleno = require('bleno');
var CmdsBase = require('./cmds-base');
var CmdsChar = require('./cmds-char');

function CmdsService(cmds) {
  bleno.PrimaryService.call(this, {
    uuid: CmdsBase.BaseUuid,
    characteristics: [
      new CmdsChar.Header(cmds),
      new CmdsChar.Data(cmds),
      new CmdsChar.Result(cmds)
    ]
  });
}

util.inherits(CmdsService, bleno.PrimaryService);

module.exports = CmdsService;
