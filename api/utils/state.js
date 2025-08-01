// 存储验证状态：userId => { correctOption, timeout }
const pendingVerifications = new Map();

module.exports = {
  pendingVerifications,
};
