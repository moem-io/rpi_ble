var models = require("../../models");
var packetBuild = require('../packet/build');

function addScanedNode(addr, rssi) {
  models.Nodes.findOne({where: {addr: addr}}).then((nodes) => {
    if (!nodes) {
      models.Nodes.create({
        nodeNo: appState.net.nodeCount,
        addr: addr
      }).then((model) => {
          packetBuild.run(cmdsBase.BuildType.SCAN_REQUEST, model.get('nodeNo'));
          models.Networks.create({
            parent: appState.dev.dbId,
            child: model.get('id'),
            rssi: rssi
          });
        }
      );
    }
  });
}

module.exports.addScanedNode = addScanedNode;
