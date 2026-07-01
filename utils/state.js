/**
 * Verification Tool (supports Vercel KV)
 * Handles new member verification state, ensuring persistence across requests in a Serverless environment
 */

const config = require("../config");
const { logger } = require("../utils/logger");

// Abstract storage interface
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
  // Memory store fallback (for dev env only)
  const memoryStore = new Map();
  store = {
    get: async (key) => memoryStore.get(key),
    set: async (key, value, ttlSeconds) => {
      memoryStore.set(key, value);
      // Simulate expiration
      setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000);
    },
    delete: async (key) => memoryStore.delete(key)
  };
}

/**
 * Set pending verification
 * @param {number} chatId 
 * @param {number} userId 
 * @param {Object} data - Contains correctIndex, messageId, timestamp
 * @param {number} ttlSeconds - Expiration time (seconds)
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
