/**
 * 统一错误处理模块
 * 处理和发送错误消息
 */

const { error: logError } = require("../utils/logger");

/**
 * 发送错误消息给用户
 * @param {Object} bot - Telegram Bot 实例
 * @param {number} chatId - 聊天ID
 * @param {string} message - 错误消息
 */
const sendErrorMessage = async (bot, chatId, message) => {
  try {
    await bot.sendMessage(chatId, message);
  } catch (sendError) {
    logError("Failed to send error message to user", { error: sendError.message });
  }
};

/**
 * 创建带有chatId的错误对象
 * @param {string} message - 错误消息
 * @param {number} chatId - 聊天ID
 * @returns {Error} 带有chatId的错误对象
 */
const createErrorWithChatId = (message, chatId) => {
  const error = new Error(message);
  error.chatId = chatId;
  return error;
};

/**
 * 处理命令执行错误
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} request - 请求对象
 * @param {Error} error - 错误对象
 */
const handleCommandError = async (bot, request, error) => {
  logError("Caught error in command", { error: error.message });
  // 尝试从错误中获取 chatId
  const chatId = error.chatId || request.body?.message?.chat?.id;
  if (chatId) {
    await sendErrorMessage(bot, chatId, "❗️ 命令执行失败，请联系管理员。");
  }
};

module.exports = {
  sendErrorMessage,
  createErrorWithChatId,
  handleCommandError,
};