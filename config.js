/**
 * 机器人核心配置文件
 * 管理群组白名单、机器人token等核心配置
 */

const { error } = require('./utils/logger');

/**
 * 从环境变量获取配置
 * @returns {Object} 配置对象
 */
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

    // GitHub监控配置
    githubMonitor: {
      // 允许监控的仓库列表（逗号分隔）
      allowedRepos: process.env.ALLOWED_GITHUB_REPOS
        ? process.env.ALLOWED_GITHUB_REPOS.split(',').map(repo => repo.trim())
        : [],
      // 接收通知的用户ID
      notificationUserId: process.env.NOTIFICATION_USER_ID ? parseInt(process.env.NOTIFICATION_USER_ID) : null,
    },
  };
};

/**
 * 验证配置项是否正确设置
 * @param {Object} config - 配置对象
 * @returns {boolean} 配置是否有效
 */
const validateConfig = (config) => {
  const errors = [];
  
  // 验证必填项
  if (!config.telegramToken) {
    errors.push('TELEGRAM_TOKEN is required');
  }
  
  // 验证验证超时时间
  if (isNaN(config.verificationTimeout) || config.verificationTimeout <= 0) {
    errors.push('VERIFICATION_TIMEOUT must be a positive number');
  }
  
  // 验证群组ID列表
  if (config.allowedGroups.some(id => isNaN(id))) {
    errors.push('All ALLOWED_GROUPS must be valid numbers');
  }
  
  // 验证管理员ID列表
  if (config.adminUsers.some(id => isNaN(id))) {
    errors.push('All ADMIN_USERS must be valid numbers');
  }

  if (errors.length > 0) {
    error('Configuration validation failed:', errors.join('; '));
    return false;
  }
  
  return true;
};

// 导出配置
const config = getConfig();

// 在应用启动时验证配置
if (!validateConfig(config)) {
  console.error('Configuration validation failed. Some features may not work properly.');
} else {
  console.log('Configuration validated successfully');
}

module.exports = config;