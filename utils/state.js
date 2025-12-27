const config = require("../config");

// 存储验证状态：userId => { correctOption, timeout }
let pendingVerifications;

// 根据配置决定使用哪种存储方式
if (config.kv.enabled) {
  // 如果启用KV存储，则使用KV存储
  const { kv } = require('@vercel/kv');
  const { error: logError } = require('./logger');

  pendingVerifications = {
    // 使用KV存储的实现
    get: async (key) => {
      try {
        const value = await kv.get(`${config.kv.prefix}verification:${key}`);
        return value;
      } catch (error) {
        logError('KV get error', { error: error.message, key });
        return null;
      }
    },
    set: async (key, value) => {
      try {
        // 使用配置的超时时间作为过期时间
        await kv.set(`${config.kv.prefix}verification:${key}`, value, {
          ex: Math.floor(config.verificationTimeout / 1000) // 转换为秒
        });
      } catch (error) {
        logError('KV set error', { error: error.message, key });
      }
    },
    delete: async (key) => {
      try {
        await kv.del(`${config.kv.prefix}verification:${key}`);
      } catch (error) {
        logError('KV del error', { error: error.message, key });
      }
    }
  };
} else {
  // 否则使用内存Map存储
  const memoryStore = new Map();
  pendingVerifications = {
    get: (key) => memoryStore.get(key),
    set: (key, value) => memoryStore.set(key, value),
    delete: (key) => memoryStore.delete(key)
  };
}

module.exports = {
  pendingVerifications,
};