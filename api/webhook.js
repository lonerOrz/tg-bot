const TelegramBot = require("node-telegram-bot-api");
const commandDispatcher = require("./commands");
const handleVerify = require("./verify");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

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
    console.error("Caught error in webhook:", error);
    // 尝试从错误中获取 chatId
    const chatId = error.chatId || request.body?.message?.chat?.id;
    if (chatId) {
      try {
        await bot.sendMessage(chatId, "❗️ 命令执行失败，请联系管理员。");
      } catch (sendError) {
        console.error("Failed to send error message to user:", sendError);
      }
    }
  } finally {
    response.status(200).send("OK");
  }
};
