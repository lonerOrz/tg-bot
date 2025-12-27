const permissionsCheck = require("./permissions");
const handleHello = require("./hello");
const handleTestVerify = require("./testVerify");
const handleDice = require("./dice");
const config = require("../config");
const { createErrorWithChatId } = require("../services/errorHandler");

const commands = {
  "/checkbot": permissionsCheck,
  "/hello": handleHello,
  "/testverify": handleTestVerify,
  "/dice": handleDice,
};

module.exports = async (bot, msg) => {
  const text = msg.text.trim();
  const cmd = text.split(" ")[0].split("@")[0];

  // 检查是否在允许的群组中
  const chatId = msg.chat.id;
  if (config.enableGroupWhitelist && msg.chat.type.includes("group") && !config.allowedGroups.includes(chatId)) {
    // 如果群组不在白名单中，直接返回错误
    throw createErrorWithChatId("❌ 此群组未被授权使用机器人。", chatId);
  }

  const handler = commands[cmd];
  if (handler) {
    // 这里不再需要 try/catch，因为错误会由 webhook.js 统一处理
    await handler(bot, msg);
  }
  // 如果没有匹配的命令，则不执行任何操作
};