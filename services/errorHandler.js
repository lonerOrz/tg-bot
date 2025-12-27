/**
 * 统一错误处理模块
 * 处理和发送错误消息
 */

const { error: logError } = require("../utils/logger");

/**
 * 权限错误类
 */
class PermissionError extends Error {
  constructor(message, chatId) {
    super(message);
    this.name = 'PermissionError';
    this.chatId = chatId;
    this.type = 'permission';
  }
}

/**
 * 网络错误类
 */
class NetworkError extends Error {
  constructor(message, chatId) {
    super(message);
    this.name = 'NetworkError';
    this.chatId = chatId;
    this.type = 'network';
  }
}

/**
 * 业务错误类
 */
class BusinessError extends Error {
  constructor(message, chatId) {
    super(message);
    this.name = 'BusinessError';
    this.chatId = chatId;
    this.type = 'business';
  }
}

/**
 * API 限制错误类
 */
class ApiLimitError extends Error {
  constructor(message, chatId) {
    super(message);
    this.name = 'ApiLimitError';
    this.chatId = chatId;
    this.type = 'api_limit';
  }
}

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
  return new BusinessError(message, chatId);
};

/**
 * 创建权限错误
 * @param {string} message - 错误消息
 * @param {number} chatId - 聊天ID
 * @returns {PermissionError} 权限错误对象
 */
const createPermissionError = (message, chatId) => {
  return new PermissionError(message, chatId);
};

/**
 * 创建网络错误
 * @param {string} message - 错误消息
 * @param {number} chatId - 聊天ID
 * @returns {NetworkError} 网络错误对象
 */
const createNetworkError = (message, chatId) => {
  return new NetworkError(message, chatId);
};

/**
 * 创建API限制错误
 * @param {string} message - 错误消息
 * @param {number} chatId - 聊天ID
 * @returns {ApiLimitError} API限制错误对象
 */
const createApiLimitError = (message, chatId) => {
  return new ApiLimitError(message, chatId);
};

/**
 * 根据错误类型获取用户友好的错误消息
 * @param {Error} error - 错误对象
 * @returns {string} 用户友好的错误消息
 */
const getUserFriendlyMessage = (error) => {
  switch (error.type) {
    case 'permission':
      return error.message || "❌ 您没有权限执行此操作。";
    case 'network':
      return "⚠️ 网络连接出现问题，请稍后重试。";
    case 'api_limit':
      return "⏳ 机器人操作过于频繁，请稍后再试。";
    case 'business':
    default:
      return "❗️ 操作失败，请稍后重试或联系管理员。";
  }
};

/**
 * 处理命令执行错误
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} request - 请求对象
 * @param {Error} error - 错误对象
 */
const handleCommandError = async (bot, request, error) => {
  // 记录错误
  logError("Caught error in command", { 
    error: error.message, 
    stack: error.stack,
    type: error.type || 'unknown',
    name: error.name
  });

  // 确定聊天ID
  const chatId = error.chatId || request.body?.message?.chat?.id;

  if (chatId) {
    // 根据错误类型发送不同的用户消息
    const userMessage = getUserFriendlyMessage(error);
    await sendErrorMessage(bot, chatId, userMessage);
  } else {
    // 如果无法确定聊天ID，记录错误
    logError("Could not determine chatId for error message", { error: error.message });
  }
};

module.exports = {
  sendErrorMessage,
  createErrorWithChatId,
  createPermissionError,
  createNetworkError,
  createApiLimitError,
  handleCommandError,
  PermissionError,
  NetworkError,
  BusinessError,
  ApiLimitError
};