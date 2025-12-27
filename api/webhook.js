const TelegramBot = require("node-telegram-bot-api");
const commandDispatcher = require("../commands/commands");
const handleVerify = require("../commands/verify");
const config = require("../config");
const { handleCommandError } = require("../services/errorHandler");
const { info, warn, error } = require("../utils/logger");

// 初始化机器人实例
const bot = new TelegramBot(config.telegramToken);

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