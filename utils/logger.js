/**
 * 统一日志记录模块
 * 提供统一的日志记录功能
 */

const config = require("../config");

// 日志级别枚举
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// 当前日志级别（从配置或环境变量获取）
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * 记录日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据（可选）
 */
const log = (level, message, meta = {}) => {
  const logLevel = LOG_LEVELS[level];
  
  // 如果当前日志级别低于要记录的级别，则不输出
  if (logLevel > currentLogLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  // 根据级别选择输出流
  if (level === 'ERROR' || level === 'WARN') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
};

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据（可选）
 */
const info = (message, meta) => {
  log('INFO', message, meta);
};

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据（可选）
 */
const warn = (message, meta) => {
  log('WARN', message, meta);
};

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据（可选）
 */
const error = (message, meta) => {
  log('ERROR', message, meta);
};

/**
 * 记录调试日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据（可选）
 */
const debug = (message, meta) => {
  log('DEBUG', message, meta);
};

module.exports = {
  info,
  warn,
  error,
  debug,
  LOG_LEVELS,
};