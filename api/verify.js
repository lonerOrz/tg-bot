const { pendingVerifications } = require("./utils/state");

module.exports = async (bot, body) => {
  const QUESTION = "哪一个是水果？";
  const OPTIONS = ["石头", "香蕉 🍌", "沙子", "铁锤"];
  const CORRECT_INDEX = 1;

  // 👥 新成员加入处理
  if (body.message?.new_chat_members) {
    const {
      chat: { id: chatId },
      new_chat_members,
    } = body.message;

    for (const member of new_chat_members) {
      const userId = member.id;
      const name = member.first_name || "新成员";

      try {
        // 发送验证问题
        await bot.sendMessage(
          chatId,
          `👋 欢迎 ${name}！请在 60 秒内回答问题：

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

        // 设置 60 秒超时踢人
        const timeout = setTimeout(async () => {
          if (pendingVerifications.has(userId)) {
            try {
              await bot.sendMessage(chatId, `⏰ 验证超时，${name} 已被移除。`);
              await bot.kickChatMember(chatId, userId);
              console.log(`❌ 用户 ${userId} 验证超时，已踢出群`);
            } catch (err) {
              console.error("超时踢人失败：", err);
            }
            pendingVerifications.delete(userId);
          }
        }, 60000);

        pendingVerifications.set(userId, {
          correctIndex: CORRECT_INDEX,
          timeout,
        });

        console.log(`🟢 添加验证记录：用户 ${userId} 加入待验证队列`);
      } catch (err) {
        console.error("发送验证消息失败：", err);
      }
    }
  }

  // ✅ 用户点击验证按钮处理
  if (body.callback_query) {
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

      const verifyData = pendingVerifications.get(userId);

      if (!verifyData) {
        await bot.answerCallbackQuery(callbackId, {
          text: "验证已过期或不存在。",
          show_alert: true,
        });
        return;
      }

      clearTimeout(verifyData.timeout);
      pendingVerifications.delete(userId);

      // ✅ 答对了
      if (selectedIndex === verifyData.correctIndex) {
        await bot.sendMessage(
          message.chat.id,
          `🎉 恭喜 ${from.first_name}，答对了，验证通过！欢迎加入～`,
        );
        await bot
          .deleteMessage(message.chat.id, message.message_id)
          .catch(() => { });
        await bot.answerCallbackQuery(callbackId, {
          text: "验证成功！",
        });
        console.log(`✅ 用户 ${userId} 验证成功`);
      } else {
        // ❌ 答错了
        try {
          await bot.sendMessage(
            message.chat.id,
            `❌ ${from.first_name} 答错了，已被移出群组。`,
          );
          await bot.kickChatMember(message.chat.id, userId);
          await bot.answerCallbackQuery(callbackId, {
            text: "验证失败，已被移除。",
            show_alert: true,
          });
          console.log(`❌ 用户 ${userId} 验证失败，已踢出群`);
        } catch (err) {
          console.error("踢出失败：", err);
        }
      }
    }
  }
};
