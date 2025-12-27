const TelegramBot = require("node-telegram-bot-api");
const commandDispatcher = require("./commands/commands");
const handleVerify = require("./commands/verify");
const config = require("./lib/config");
const { handleCommandError } = require("./lib/services/errorHandler");
const { info, warn, error } = require("./lib/utils/logger");

const bot = new TelegramBot(config.telegramToken);

module.exports = async (request, response) => {
  try {
    const { body } = request;

    // 检查是否在允许的群组中
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    if (config.enableGroupWhitelist && chatId && !config.allowedGroups.includes(chatId)) {
      warn(`Blocked request from unauthorized chat: ${chatId}`);
      return response.status(403).send("Forbidden: Unauthorized chat");
    }

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
