const config = require("../config");
const { createErrorWithChatId } = require("../services/errorHandler");

module.exports = async (bot, msg) => {
  const {
    chat: {
      id: chatId
    },
    chat,
    text
  } = msg;

  const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
};

// 命令元数据
module.exports.commandMetadata = {
  command: 'hello',
  description: '发送问候语'
};