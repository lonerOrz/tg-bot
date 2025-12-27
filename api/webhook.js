const TelegramBot = require("node-telegram-bot-api");
const commandDispatcher = require("../commands/commands");
const handleVerify = require("../commands/verify");
const config = require("../config");
const { handleCommandError } = require("../services/errorHandler");
const { info, warn, error } = require("../utils/logger");

// 初始化机器人实例
const bot = new TelegramBot(config.telegramToken);

// 在开发/首次部署时注册命令
// 注意：在生产环境中，我们通常不会在每次请求时都注册命令
// 更好的方式是使用单独的脚本来执行此操作
if (process.env.NODE_ENV !== 'production') {
  // 在非生产环境中注册命令
  const { registerBotCommands } = require("../commands/registerCommands");
  registerBotCommands(bot).catch(err => {
    console.error('命令注册失败:', err);
  });
}

module.exports = async (request, response) => {
  try {
    const { body } = request;

    if (body.message?.new_chat_members || body.callback_query) {
      await handleVerify(bot, body);
    }
    if (body.message?.text) {
      await commandDispatcher(bot, body.message);
    }

  } catch (error) {
    await handleCommandError(bot, request, error);
  } finally {
    response.status(200).send("OK");
  }
};