const { handleNewMembers, handleCallbackQuery } = require("./services/verificationService");

module.exports = async (bot, body) => {
  // 👥 新成员加入处理
  if (body.message?.new_chat_members) {
    await handleNewMembers(bot, body);
  }

  // ✅ 用户点击验证按钮处理
  if (body.callback_query) {
    await handleCallbackQuery(bot, body);
  }
};
