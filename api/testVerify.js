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

  // 为了确保测试验证流程，我们直接调用验证服务内部逻辑
  // 而不是通过handleNewMembers，这样可以避免管理员检查
  const { pendingVerifications } = require("./utils/state");
  const config = require("./config");
  const { info, warn, error: logError } = require("./utils/logger");

  // 验证问题配置
  const QUESTION = "哪一个是水果？";
  const OPTIONS = ["石头", "香蕉 🍌", "沙子", "铁锤"];
  const CORRECT_INDEX = 1;

  const userId = msg.from?.id || 123456789;
  const name = msg.from?.first_name || "测试用户";

  try {
    // 发送验证问题
    const sentMessage = await bot.sendMessage(
      chatId,
      `👋 欢迎 ${name}！请在 ${config.verificationTimeout/1000} 秒内回答问题：

*${QUESTION}*`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            OPTIONS.map((option, index) => ({
              text: option,
              callback_data: `quiz_${userId}_${index}`,
            })),
          ],
        },
      },
    );

    // 设置超时踢人
    const timeout = setTimeout(async () => {
      const verifyData = await pendingVerifications.get(userId);
      if (verifyData) {
        try {
          await bot.deleteMessage(chatId, verifyData.messageId).catch((err) => {
            logError("删除超时验证消息失败", { error: err.message });
          });
          await bot.kickChatMember(chatId, userId);
          await bot.sendMessage(chatId, `⏰ 验证超时，${name} 已被移除。`);
          info(`用户 ${userId} 验证超时，已踢出群`);
        } catch (err) {
          logError("超时踢人失败", { error: err.message });
          await bot.sendMessage(
            chatId,
            `❗️ 无法移除 ${name}，TA 可能拥有管理员权限或我不是群组管理员。`,
          );
        }
        await pendingVerifications.delete(userId);
      }
    }, config.verificationTimeout);

    await pendingVerifications.set(userId, {
      correctIndex: CORRECT_INDEX,
      timeout,
      messageId: sentMessage.message_id,
    });

    info(`添加验证记录：用户 ${userId} 加入待验证队列`);
  } catch (err) {
    logError("发送验证消息失败", { error: err.message });
  }
};