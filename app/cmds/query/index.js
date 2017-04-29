var models = require("../../models");
var cmdsBase = require('../cmds-base');
var packetBuild = require('../packet/build');

var addNode = function (addr) {
  models.Nodes.findOne({where: {addr: addr}}).then((nodes) => {
    return (!nodes) ? models.Nodes.create({nodeNo: 0, addr: addr}) : nodes
  }).then((model) => appState.dev.dbId = model.get('id'));
};

var addScanedNode = function (nodeNo, addr, rssi, callback) {
  models.Nodes.findOne({where: {addr: addr}}).then((nodes) => {
    if (!nodes) {
      return models.Nodes.create({nodeNo: nodeNo, addr: addr})
    }
    //TODO: IF NONE There is Already Added?
    // throw new Error("Already Added!");
  }).then((model) => {
    return models.Networks.create({
      parent: appState.dev.dbId,
      child: model.get('id'),
      rssi: rssi
    });
  }).then(() => {
    return packetBuild.run(cmdsBase.BuildType.SCAN_REQUEST, {nodeNo: nodeNo}, callback);
  });
};

module.exports.addNode = addNode;
module.exports.addScanedNode = addScanedNode;
