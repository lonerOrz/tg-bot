/**
 * Robot core configuration
 * Manages core configurations such as group whitelist, bot token, etc.
 */

const { error } = require('./utils/logger');

/**
 * Get configuration from environment variables
 * @returns {Object} Configuration object
 */
const getConfig = () => {
  return {
    telegramToken: process.env.TELEGRAM_TOKEN,

    allowedGroups: process.env.ALLOWED_GROUPS 
      ? process.env.ALLOWED_GROUPS.split(',').map(id => parseInt(id.trim()))
      : [],

    enableGroupWhitelist: process.env.ENABLE_GROUP_WHITELIST === 'true' || false,

    adminUsers: process.env.ADMIN_USERS
      ? process.env.ADMIN_USERS.split(',').map(id => parseInt(id.trim()))
      : [],

    verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT) || 60000,
    
    kv: {
      enabled: process.env.KV_ENABLED === 'true',
      prefix: process.env.KV_PREFIX || 'tgbot:',
    },

    githubMonitor: {
      allowedRepos: process.env.ALLOWED_GITHUB_REPOS
        ? process.env.ALLOWED_GITHUB_REPOS.split(',').map(repo => repo.trim())
        : [],
      notificationUserId: process.env.NOTIFICATION_USER_ID ? parseInt(process.env.NOTIFICATION_USER_ID) : null,
      enableStarNotifications: process.env.ENABLE_STAR_NOTIFICATIONS !== 'false',
      enableForkNotifications: process.env.ENABLE_FORK_NOTIFICATIONS !== 'false',
      enableWatchNotifications: process.env.ENABLE_WATCH_NOTIFICATIONS === 'true',
      enableIssueNotifications: process.env.ENABLE_ISSUE_NOTIFICATIONS === 'true',
      enablePullRequestNotifications: process.env.ENABLE_PULL_REQUEST_NOTIFICATIONS === 'true',
      enableReleaseNotifications: process.env.ENABLE_RELEASE_NOTIFICATIONS !== 'false',
    },

    githubBotWebhook: {
      token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
      allowedUserIds: process.env.GITHUB_ALLOWED_USER_IDS
        ? process.env.GITHUB_ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
        : [],
      secret: process.env.GITHUB_BOT_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || '',
    },

    githubAppBuild: {
      appId: process.env.GITHUB_APP_ID || "2596089",
      privateKey: process.env.GITHUB_PRIVATE_KEY || "",
      targetOwner: process.env.GITHUB_TARGET_OWNER || "lonerOrz",
      targetRepo: process.env.GITHUB_TARGET_REPO || "nixpkgs-review-gha"
    }
  };
};

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether configuration is valid
 */
const validateConfig = (config) => {
  const errors = [];
  
  if (!config.telegramToken) {
    errors.push('TELEGRAM_TOKEN is required');
  }
  
  if (isNaN(config.verificationTimeout) || config.verificationTimeout <= 0) {
    errors.push('VERIFICATION_TIMEOUT must be a positive number');
  }
  
  if (config.allowedGroups.some(id => isNaN(id))) {
    errors.push('All ALLOWED_GROUPS must be valid numbers');
  }
  
  if (config.adminUsers.some(id => isNaN(id))) {
    errors.push('All ADMIN_USERS must be valid numbers');
  }

  if (typeof config.githubMonitor.enableStarNotifications !== 'boolean') {
    errors.push('ENABLE_STAR_NOTIFICATIONS must be a boolean value');
  }
  if (typeof config.githubMonitor.enableForkNotifications !== 'boolean') {
    errors.push('ENABLE_FORK_NOTIFICATIONS must be a boolean value');
  }
  if (typeof config.githubMonitor.enableWatchNotifications !== 'boolean') {
    errors.push('ENABLE_WATCH_NOTIFICATIONS must be a boolean value');
  }
  if (typeof config.githubMonitor.enableIssueNotifications !== 'boolean') {
    errors.push('ENABLE_ISSUE_NOTIFICATIONS must be a boolean value');
  }
  if (typeof config.githubMonitor.enablePullRequestNotifications !== 'boolean') {
    errors.push('ENABLE_PULL_REQUEST_NOTIFICATIONS must be a boolean value');
  }
  if (typeof config.githubMonitor.enableReleaseNotifications !== 'boolean') {
    errors.push('ENABLE_RELEASE_NOTIFICATIONS must be a boolean value');
  }

  if (config.githubAppBuild.appId && isNaN(parseInt(config.githubAppBuild.appId))) {
    errors.push('GITHUB_APP_ID must be a valid number');
  }

  if (errors.length > 0) {
    error('Configuration validation failed:', errors.join('; '));
    return false;
  }

  return true;
};

const config = getConfig();

if (!validateConfig(config)) {
  console.error('Configuration validation failed. Some features may not work properly.');
} else {
  console.log('Configuration validated successfully');
}

module.exports = config;
