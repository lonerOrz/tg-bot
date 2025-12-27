const config = require("./config");
const { createErrorWithChatId } = require("./services/errorHandler");

module.exports = async (bot, msg) => {
  const {
    chat: {
      id: chatId
    },
    chat,
    text
  } = msg;

  // 检查是否在允许的群组中
  if (config.enableGroupWhitelist && chat.type.includes("group") && !config.allowedGroups.includes(chatId)) {
    throw createErrorWithChatId("❌ 此群组未被授权使用机器人。", chatId);
  }

  const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
};
