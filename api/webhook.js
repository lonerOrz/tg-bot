const TelegramBot = require("node-telegram-bot-api");
const handleHello = require("./hello");
const handleVerify = require("./verify");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

module.exports = async (request, response) => {
  try {
    const { body } = request;

    // 加群验证逻辑
    if (body.message?.new_chat_members || body.callback_query) {
      await handleVerify(bot, body);
    }

    // 打招呼逻辑
    if (body.message?.text) {
      await handleHello(bot, body);
    }
  } catch (error) {
    console.error("Error in bot:", error.toString());
  }

  response.send("OK");
};
