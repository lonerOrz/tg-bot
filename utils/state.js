/**
 * 验证工具 (支持 Vercel KV)
 * 处理新成员验证状态，确保在 Serverless 环境下跨请求持久化
 */

const config = require("../config");
const { logger } = require("../utils/logger");

// 抽象持久化存储接口
let store;

if (config.kv.enabled) {
  const { kv } = require('@vercel/kv');
  store = {
    get: async (key) => await kv.get(`${config.kv.prefix}verification:${key}`),
    set: async (key, value, ttlSeconds) => {
      await kv.set(`${config.kv.prefix}verification:${key}`, value, { ex: ttlSeconds });
    },
    delete: async (key) => await kv.del(`${config.kv.prefix}verification:${key}`)
  };
} else {
  // 后备内存存储（仅限开发环境）
  const memoryStore = new Map();
  store = {
    get: async (key) => memoryStore.get(key),
    set: async (key, value, ttlSeconds) => {
      memoryStore.set(key, value);
      // 模拟过期
      setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000);
    },
    delete: async (key) => memoryStore.delete(key)
  };
}

/**
 * 设置挂起的验证
 * @param {number} chatId 
 * @param {number} userId 
 * @param {Object} data 包含 correctIndex, messageId, timestamp
 * @param {number} ttlSeconds 有效期（秒）
 */
const setPendingVerification = async (chatId, userId, data, ttlSeconds = 300) => {
  await store.set(`${chatId}:${userId}`, data, ttlSeconds);
};

const getPendingVerification = async (chatId, userId) => {
  return await store.get(`${chatId}:${userId}`);
};

const removePendingVerification = async (chatId, userId) => {
  await store.delete(`${chatId}:${userId}`);
};

module.exports = {
  setPendingVerification,
  getPendingVerification,
  removePendingVerification,
};
