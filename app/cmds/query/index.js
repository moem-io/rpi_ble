var models = require("../../models");
var packetBuild = require('../packet/build');
var cmdsBase = require('../cmds-base');

var addNode = function (addr) {
  models.Nodes.findOne({where: {addr: addr}}).then((nodes) => {
    if (!nodes) {
      models.Nodes.create({nodeNo: 0, addr: addr}).then(
        (model) => appState.dev.dbId = model.get('id')
      );
    }
  });
};

var addScanedNode = function (addr, rssi, callback) {
  models.Nodes.findOne({where: {addr: addr}}).then((nodes) => {
    if (!nodes) {
      models.Nodes.create({nodeNo: appState.net.nodeCount, addr: addr}).then((model) => {
        packetBuild.run(cmdsBase.BuildType.SCAN_REQUEST, model.get('nodeNo'));
        models.Networks.create({
          parent: appState.dev.dbId,
          child: model.get('id'),
          rssi: rssi
        }).then(() => callback());
      });
    }
  });
};

module.exports.addNode = addNode;
module.exports.addScanedNode = addScanedNode;
