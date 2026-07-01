const config = {
  telegramToken: process.env.TELEGRAM_TOKEN,

  allowedGroups: process.env.ALLOWED_GROUPS
    ? process.env.ALLOWED_GROUPS.split(',').map(id => parseInt(id.trim()))
    : [],

  enableGroupWhitelist: process.env.ENABLE_GROUP_WHITELIST === 'true',

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

module.exports = config;
