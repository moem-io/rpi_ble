var util = require('util');
var events = require('events');

var CmdsHeader = {
  NORMAL: 0,
  DEEP_DISH: 1,
  THIN: 2,
};

var CmdsData = {
  NONE: 0,
  PEPPERONI: 1 << 0,
  MUSHROOMS: 1 << 1,
  EXTRA_CHEESE: 1 << 2,
  BLACK_OLIVES: 1 << 3,
  CANADIAN_BACON: 1 << 4,
  PINEAPPLE: 1 << 5,
  BELL_PEPPERS: 1 << 6,
  SAUSAGE: 1 << 7,
};

var CmdsResult = {
  HALF_BAKED: 0,
  BAKED: 1,
  CRISPY: 2,
  BURNT: 3,
  ON_FIRE: 4
};

function Cmds() {
  events.EventEmitter.call(this);
  this.toppings = CmdsData.NONE;
  this.crust = CmdsHeader.NORMAL;
}

util.inherits(Cmds, events.EventEmitter);

Cmds.prototype.bakeRslt = function (temperature) {
  var time = temperature * 10;
  var self = this;
  console.log('baking cmds at', temperature, 'degrees for', time, 'milliseconds');
  setTimeout(function () {
    var result =
      (temperature < 350) ? CmdsResult.HALF_BAKED :
        (temperature < 450) ? CmdsResult.BAKED :
          (temperature < 500) ? CmdsResult.CRISPY :
            (temperature < 600) ? CmdsResult.BURNT :
              CmdsResult.ON_FIRE;
    self.emit('ready', result);
  }, time);
};

module.exports.Cmds = Cmds;
module.exports.CmdsData = CmdsData;
module.exports.CmdsHeader = CmdsHeader;
module.exports.CmdsResult = CmdsResult;
