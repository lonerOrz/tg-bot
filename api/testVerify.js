const config = require("./config");
const { createErrorWithChatId } = require("./services/errorHandler");
const { handleNewMembers } = require("./services/verificationService");

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;

  // 检查是否在允许的群组中
  if (config.enableGroupWhitelist && msg.chat.type.includes("group") && !config.allowedGroups.includes(chatId)) {
    throw createErrorWithChatId("❌ 此群组未被授权使用机器人。", chatId);
  }

  // 检查是否在群组中
  if (!msg.chat.type.includes("group")) {
    throw createErrorWithChatId("⚠️ 此命令只能在群组中使用。", chatId);
  }

  // 检查机器人是否是管理员
  const me = await bot.getMe();
  const admins = await bot.getChatAdministrators(chatId);
  const botAdmin = admins.find((admin) => admin.user.id === me.id);

  if (!botAdmin) {
    throw createErrorWithChatId("❌ 我不是管理员，请先将我设为群管理员！", chatId);
  }

  // 模拟新成员加入的消息体
  const mockBody = {
    message: {
      chat: { id: chatId },
      new_chat_members: [
        {
          id: msg.from?.id || 123456789, // 使用触发命令的用户ID，或默认ID
          first_name: msg.from?.first_name || "测试用户",
          is_bot: false
        }
      ]
    }
  };

  // 调用验证服务处理模拟的新成员
  await handleNewMembers(bot, mockBody);
};