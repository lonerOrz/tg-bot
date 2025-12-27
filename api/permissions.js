const {
  checkIfInGroup,
  checkGroupWhitelist,
  checkBotAdmin,
  buildPermissionsReport
} = require("./services/permissionService");
const { createErrorWithChatId } = require("./services/errorHandler");

module.exports = async (bot, msg) => {
  // 检查是否在群组中
  checkIfInGroup(msg);

  // 检查是否在允许的群组中
  checkGroupWhitelist(msg);

  // 检查机器人是否为管理员
  const botAdmin = await checkBotAdmin(bot, msg);

  // 构建并发送权限报告
  const text = buildPermissionsReport(botAdmin);

  // 直接发送成功消息
  await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
};