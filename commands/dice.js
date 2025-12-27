const { createErrorWithChatId } = require("../services/errorHandler");

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;

  // 掷骰子，生成1到6之间的随机数
  const diceValue = Math.floor(Math.random() * 6) + 1;

  // 发送骰子结果
  await bot.sendDice(chatId, { emoji: '🎲' });

  // 可选：发送文本消息说明结果
  // await bot.sendMessage(chatId, `🎲 掷出了 ${diceValue} 点！`);
};