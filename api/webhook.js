const TelegramBot = require("node-telegram-bot-api");
const handleVerify = require("./verify");
const commandDispatcher = require("./commands");
const handleHello = require("./hello");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

module.exports = async (request, response) => {
  try {
    const { body } = request;

    // 加群验证逻辑
    if (body.message?.new_chat_members || body.callback_query) {
      await handleVerify(bot, body);
    }

    // 文本命令逻辑
    if (body.message?.text) {
      const handled = await commandDispatcher(bot, body.message);
      if (!handled) {
        // 非命令文本，不做任何处理
      }
    }
  } catch (error) {
    console.error("Error in bot:", error.toString());
  }

  response.send("OK");
};
