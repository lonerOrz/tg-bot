const commandHandler = require('./commandHandler');

// 导入所有命令处理器
const permissionsCheck = require('./permissions');
const handleHello = require('./hello');
const handleTestVerify = require('./testVerify');
const handleDice = require('./dice');

// 注册所有命令
// /checkbot 仅在群组中可用，不需要白名单验证（因为它用于检查机器人权限）
commandHandler
  .register('/checkbot', permissionsCheck, { requiresGroup: true, requiresWhitelist: false })
  // /hello 可在任意地方使用，但如果是群组则需要白名单验证
  .register('/hello', handleHello, { requiresWhitelist: true })
  // /testverify 可在任意地方使用，不需要白名单验证
  .register('/testverify', handleTestVerify, { requiresWhitelist: false })
  // /dice 可在任意地方使用，但如果是群组则需要白名单验证
  .register('/dice', handleDice, { requiresWhitelist: true });

/**
 * 命令分发器 - 统一处理所有机器人命令
 * @param {import('node-telegram-bot-api')} bot - Telegram Bot 实例
 * @param {Object} msg - 消息对象
 * @returns {Promise<boolean>} - 是否成功执行了命令
 */
module.exports = async (bot, msg) => {
  return await commandHandler.execute(bot, msg);
};