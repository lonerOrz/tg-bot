/**
 * 机器人核心配置文件
 * 管理群组白名单、机器人token等核心配置
 */

// 从环境变量获取配置，如果未设置则使用默认值
const getConfig = () => {
  return {
    // 机器人token
    telegramToken: process.env.TELEGRAM_TOKEN,

    // 允许使用机器人的群组ID列表（白名单）
    allowedGroups: process.env.ALLOWED_GROUPS 
      ? process.env.ALLOWED_GROUPS.split(',').map(id => parseInt(id.trim()))
      : [],

    // 是否启用群组白名单功能
    enableGroupWhitelist: process.env.ENABLE_GROUP_WHITELIST === 'true' || false,

    // 机器人管理员ID列表
    adminUsers: process.env.ADMIN_USERS
      ? process.env.ADMIN_USERS.split(',').map(id => parseInt(id.trim()))
      : [],

    // 验证超时时间（毫秒）
    verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT) || 60000,
    
    // KV存储配置（如果使用）
    kv: {
      enabled: process.env.KV_ENABLED === 'true',
      prefix: process.env.KV_PREFIX || 'tgbot:',
    },
  };
};

// 导出配置
const config = getConfig();
module.exports = config;