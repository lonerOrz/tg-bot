const TelegramBot = require("node-telegram-bot-api");
const handleVerify = require("../api/verify");

const fakeBot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });

// 模拟一个新用户加入群的消息
const fakeJoinEvent = {
  message: {
    chat: { id: -1002737653327 },
    new_chat_members: [
      {
        id: 2088951703,
        first_name: "❄lonerOrz",
      },
    ],
  },
};

(async () => {
  console.log("👤 模拟新成员入群验证...");
  let messageId;
  try {
    const sentMessage = await handleVerify(fakeBot, fakeJoinEvent);
    messageId = sentMessage?.message_id;
    console.log("发送的验证消息 ID:", messageId);
  } catch (error) {
    console.error("新成员加入测试失败:", error.message);
    return;
  }

  // 模拟点击按钮的回调
  const fakeCallbackQuery = {
    callback_query: {
      id: `test_${Date.now()}`, // 使用时间戳生成临时 ID
      from: {
        id: 2088951703,
        first_name: "❄lonerOrz",
      },
      message: {
        chat: { id: -1002737653327 },
        message_id: messageId || 111, // 使用真实的 message_id
      },
      data: "quiz_2088951703_1", // 正确答案
    },
  };

  // 手动测试提示
  console.log("请在群组中手动点击验证选项（例如‘香蕉 🍌’）以测试回调逻辑");

  // 注释自动模拟回调，因为 answerCallbackQuery 需要有效 ID
  /*
  setTimeout(async () => {
    console.log("👆 模拟用户点击验证按钮...");
    try {
      await handleVerify(fakeBot, fakeCallbackQuery);
    } catch (error) {
      console.error("回调查询测试失败:", error.message);
    }
  }, 3000);
  */
})();
