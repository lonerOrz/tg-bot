/**
 * 验证服务模块
 * 处理新成员验证逻辑
 */

const { pendingVerifications } = require("../utils/state");
const config = require("../config");
const { info, warn, error: logError } = require("../utils/logger");

// 验证问题配置
const QUESTION = "哪一个是水果？";
const OPTIONS = ["石头", "香蕉 🍌", "沙子", "铁锤"];
const CORRECT_INDEX = 1;

/**
 * 处理新成员加入
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} body - 请求体
 */
const handleNewMembers = async (bot, body) => {
  const {
    chat: { id: chatId },
    new_chat_members,
  } = body.message;

  for (const member of new_chat_members) {
    if (member.is_bot) continue;

    const userId = member.id;
    const name = member.first_name || "新成员";

    // 检查新成员是否是管理员
    const admins = await bot.getChatAdministrators(chatId);
    const isAdmin = admins.find((admin) => admin.user.id === userId);

    if (isAdmin) {
      info(`新成员 ${name} (${userId}) 是管理员，跳过验证。`);
      continue;
    }

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
  }
};

/**
 * 处理用户点击验证按钮
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} body - 请求体
 */
const handleCallbackQuery = async (bot, body) => {
  const { data, from, message, id: callbackId } = body.callback_query;
  const match = data.match(/^quiz_(\d+)_(\d+)$/);

  if (match) {
    const [_, userIdStr, selectedIndexStr] = match;
    const userId = parseInt(userIdStr);
    const selectedIndex = parseInt(selectedIndexStr);

    // 防止别人代答
    if (from.id !== userId) {
      await bot.answerCallbackQuery(callbackId, {
        text: "这不是你的问题，请不要干扰验证！",
        show_alert: true,
      });
      return;
    }

    const verifyData = await pendingVerifications.get(userId);

    if (!verifyData) {
      await bot.answerCallbackQuery(callbackId, {
        text: "验证已过期或不存在。",
        show_alert: true,
      });
      return;
    }

    // 关键修复：先清除计时器并删除记录，再判断对错
    clearTimeout(verifyData.timeout);
    await pendingVerifications.delete(userId);

    // ✅ 答对了
    if (selectedIndex === verifyData.correctIndex) {
      await bot.sendMessage(
        message.chat.id,
        `🎉 恭喜 ${from.first_name}，答对了，验证通过！欢迎加入～`,
      );
      await bot
        .deleteMessage(message.chat.id, message.message_id)
        .catch((err) => {
          logError("删除验证消息失败", { error: err.message });
        });
      await bot.answerCallbackQuery(callbackId, {
        text: "验证成功！",
      });
      info(`用户 ${userId} 验证成功`);
    } else {
      // ❌ 答错了
      try {
        await bot.sendMessage(
          message.chat.id,
          `❌ ${from.first_name} 答错了，已被移出群组。`,
        );
        await bot.kickChatMember(message.chat.id, userId);
        await bot
          .deleteMessage(message.chat.id, message.message_id)
          .then(() => info(`验证消息已删除，用户ID: ${userId}`))
          .catch((err) => {
            warn("删除验证消息失败", { error: err.message, userId, messageId: message.message_id });
          });
        await bot.answerCallbackQuery(callbackId, {
          text: "验证失败，已被移除。",
          show_alert: true,
        });
        info(`用户 ${userId} 验证失败，已踢出群`);
      } catch (err) {
        logError("踢出失败", { error: err.message });
      }
    }
  }
};

module.exports = {
  handleNewMembers,
  handleCallbackQuery,
};