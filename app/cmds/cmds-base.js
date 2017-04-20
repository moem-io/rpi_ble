const BaseUuid = '0000A00000000010800000AABBCCDDEE';
const HeaderUuid = '0000A00100000010800000AABBCCDDEE';
const DataUuid = '0000A00200000010800000AABBCCDDEE';
const ResultUuid = '0000A00300000010800000AABBCCDDEE';

const CmdsResult = {
  IDLE: 0,
  HEADER: 1,
  DATA: 2,
  INTERPRET: 3,
  INTERPRET_ERROR: 4,
  ERROR: 255
};

module.exports.BaseUuid = BaseUuid;
module.exports.HeaderUuid = HeaderUuid;
module.exports.DataUuid = DataUuid;
module.exports.ResultUuid = ResultUuid;

module.exports.CmdsResult = CmdsResult;
