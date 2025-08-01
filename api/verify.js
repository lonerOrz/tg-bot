const { pendingVerifications } = require("./utils/state");

module.exports = async (bot, body) => {
  const QUESTION = "哪一个是水果？";
  const OPTIONS = ["石头", "香蕉 🍌", "沙子", "铁锤"];
  const CORRECT_INDEX = 1; // 答案是“香蕉 🍌”

  // 1. 新成员加入
  if (body.message?.new_chat_members) {
    const {
      chat: { id: chatId },
      new_chat_members,
    } = body.message;

    for (const member of new_chat_members) {
      const userId = member.id;
      const name = member.first_name || "新成员";

      // 发送问题
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

      // 设置 60 秒倒计时
      const timeout = setTimeout(async () => {
        if (pendingVerifications.has(userId)) {
          await bot.kickChatMember(chatId, userId);
          pendingVerifications.delete(userId);
          console.log(`❌ 用户 ${userId} 验证超时，已踢出群`);
        }
      }, 60000);

      pendingVerifications.set(userId, {
        correctIndex: CORRECT_INDEX,
        timeout,
      });
    }
  }

  // 2. 用户点击验证按钮
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

      clearTimeout(verifyData.timeout); // 清除定时器
      pendingVerifications.delete(userId);

      if (selectedIndex === verifyData.correctIndex) {
        await bot.sendMessage(
          message.chat.id,
          `🎉 欢迎 ${from.first_name}，你答对啦，验证通过！`,
        );
        await bot
          .deleteMessage(message.chat.id, message.message_id)
          .catch(() => { });
        await bot.answerCallbackQuery(callbackId, { text: "验证成功！" });
      } else {
        await bot.kickChatMember(message.chat.id, userId);
        await bot.answerCallbackQuery(callbackId, {
          text: "验证失败，已被移除。",
          show_alert: true,
        });
        console.log(`❌ 用户 ${userId} 验证失败，已踢出群`);
      }
    }
  }
};
