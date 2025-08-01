const TelegramBot = require("node-telegram-bot-api");
const handleVerify = require("./verify");
const commandDispatcher = require("./commands");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

module.exports = async (request, response) => {
  try {
    const { body } = request;
    console.log("INFO: Received update", JSON.stringify(body, null, 2));

    if (body.message?.new_chat_members || body.callback_query) {
      console.log("INFO: Routing to handleVerify");
      await handleVerify(bot, body);
    } else if (body.message?.text) {
      console.log("INFO: Routing to commandDispatcher");
      await commandDispatcher(bot, body.message);
    } else {
      console.log("INFO: No handler for this update type.");
    }

  } catch (error) {
    console.error("ERROR: Top-level error in webhook:", error);
    // 在顶层捕获错误，防止整个服务崩溃
  } finally {
    // 确保总是向 Telegram 返回一个成功的响应，防止重试
    response.status(200).send("OK");
  }
};