// api/github-webhook.js
// GitHub Webhook处理器
const crypto = require('crypto');
const config = require('../config');
const TelegramBot = require('node-telegram-bot-api');

// 创建机器人实例用于发送通知
// 注意：在Vercel环境中，我们可能需要从环境变量获取token
const botToken = process.env.TELEGRAM_TOKEN || config.telegramToken;
if (!botToken) {
  console.error('错误: 未设置TELEGRAM_TOKEN环境变量');
}

const bot = new TelegramBot(botToken, { polling: false });

// 从配置获取接收通知的用户ID
const NOTIFICATION_USER_ID = config.githubMonitor.notificationUserId;
if (!NOTIFICATION_USER_ID) {
  console.warn('警告: 未设置NOTIFICATION_USER_ID环境变量，将无法发送通知');
}

/**
 * 验证GitHub Webhook请求的签名
 * @param {string} payload - 请求体
 * @param {string} signature - GitHub发送的签名
 * @param {string} secret - Webhook密钥
 * @returns {boolean} 签名是否有效
 */
function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
          .update(payload, 'utf8')
          .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * 检查仓库是否在允许列表中
 * @param {string} repoFullName - 完整仓库名 (owner/repo)
 * @returns {boolean} 是否允许处理此仓库
 */
function isRepoAllowed(repoFullName) {
  // 如果允许列表为空，则允许所有仓库
  return config.githubMonitor.allowedRepos.length === 0 || 
         config.githubMonitor.allowedRepos.includes(repoFullName);
}

/**
 * 发送通知给用户
 * @param {string} message - 消息内容
 */
async function sendNotification(message) {
  if (!NOTIFICATION_USER_ID) {
    console.log('未设置NOTIFICATION_USER_ID，跳过发送通知');
    return;
  }

  try {
    await bot.sendMessage(NOTIFICATION_USER_ID, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
    console.log(`已向用户 ${NOTIFICATION_USER_ID} 发送通知`);
  } catch (error) {
    console.error(`发送通知给用户 ${NOTIFICATION_USER_ID} 时出错:`, error.message);
  }
}



/**
 * 构建Star事件消息
 */
function buildStarMessage(action, repoFullName, starredBy) {
  const actionText = action === 'created' ? '⭐ Star added' : '⭐ Star removed';
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${starredBy}`;
  return `${actionText} [${repoFullName}](${repoUrl}) by [${starredBy}](${userUrl})!\n${repoFullName} is getting more popular! 🚀`;
}

/**
 * 构建Fork事件消息
 */
function buildForkMessage(repoFullName, forker) {
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${forker}`;
  return `🧩 Fork [${repoFullName}](${repoUrl}) created by [${forker}](${userUrl})!\n${repoFullName} is being explored! 🔍`;
}

/**
 * 构建Watch事件消息
 */
function buildWatchMessage(action, repoFullName, watcher) {
  const actionText = action === 'started' ? '🔔 Started watching' : '🔕 Stopped watching';
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${watcher}`;
  return `${actionText} [${repoFullName}](${repoUrl}) by [${watcher}](${userUrl})!\nSomeone is keeping an eye on your project! 👀`;
}

/**
 * 构建Issue事件消息
 */
function buildIssueMessage(action, repoFullName, issue) {
  let actionText;
  let actionIcon;
  switch (action) {
    case 'opened':
      actionIcon = '📝';
      actionText = 'Issue opened';
      break;
    case 'closed':
      actionIcon = '✅';
      actionText = 'Issue closed';
      break;
    case 'reopened':
      actionIcon = '🔄';
      actionText = 'Issue reopened';
      break;
    default:
      actionIcon = 'ℹ️';
      actionText = `Issue ${action}`;
  }

  const repoUrl = `https://github.com/${repoFullName}`;
  const issueUrl = `https://github.com/${repoFullName}/issues/${issue.number}`;
  const userUrl = `https://github.com/${issue.user.login}`;
  return `${actionIcon} ${actionText} #${issue.number} in [${repoFullName}](${repoUrl}) by [${issue.user.login}](${userUrl})!\nGreat chance to improve your project! 🚀\nLet's keep making ${repoFullName} better! 🌟`;
}

/**
 * 构建Pull Request事件消息
 */
function buildPullRequestMessage(action, repoFullName, pr) {
  let actionText;
  let actionIcon;
  switch (action) {
    case 'opened':
      actionIcon = '🔀';
      actionText = 'Pull Request opened';
      break;
    case 'closed':
      if (pr.merged) {
        actionIcon = '✅';
        actionText = 'Pull Request merged';
      } else {
        actionIcon = '❌';
        actionText = 'Pull Request closed';
      }
      break;
    case 'reopened':
      actionIcon = '🔄';
      actionText = 'Pull Request reopened';
      break;
    case 'assigned':
      actionIcon = '👤';
      actionText = 'Pull Request assigned';
      break;
    case 'unassigned':
      actionIcon = '👤';
      actionText = 'Pull Request unassigned';
      break;
    case 'review_requested':
      actionIcon = '🔍';
      actionText = 'Pull Request review requested';
      break;
    case 'review_request_removed':
      actionIcon = '🔍';
      actionText = 'Pull Request review removed';
      break;
    default:
      actionIcon = 'ℹ️';
      actionText = `Pull Request ${action}`;
  }

  const repoUrl = `https://github.com/${repoFullName}`;
  const prUrl = `https://github.com/${repoFullName}/pull/${pr.number}`;
  const userUrl = `https://github.com/${pr.user.login}`;
  return `${actionIcon} ${actionText} #${pr.number} in [${repoFullName}](${repoUrl}) by [${pr.user.login}](${userUrl})!\nGreat contribution to your project! 🚀\nLet's keep making ${repoFullName} better! 🌟`;
}

/**
 * 构建Release事件消息
 */
function buildReleaseMessage(action, repoFullName, release) {
  let actionText;
  let actionIcon;
  switch (action) {
    case 'published':
      actionIcon = '🎁';
      actionText = 'Release published';
      break;
    case 'updated':
      actionIcon = '✏️';
      actionText = 'Release updated';
      break;
    case 'deleted':
      actionIcon = '🗑️';
      actionText = 'Release deleted';
      break;
    case 'prereleased':
      actionIcon = '🧪';
      actionText = 'Pre-release published';
      break;
    default:
      actionIcon = '🎁';
      actionText = `Release ${action}`;
  }

  const repoUrl = `https://github.com/${repoFullName}`;
  const releaseUrl = `https://github.com/${repoFullName}/releases/tag/${release.tag_name}`;
  const userUrl = `https://github.com/${release.author.login}`;
  return `${actionIcon} ${actionText} ${release.tag_name} in [${repoFullName}](${repoUrl}) by [${release.author.login}](${userUrl})!\nYour project just got an update! 🚀\nLet's keep making ${repoFullName} better! 🌟`;
}

/**
 * 处理Star事件
 */
async function handleStarEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action; // "created" 或 "deleted"
  const starredBy = payload.sender.login;

  console.log(`仓库 ${repoFullName} 的Star事件: ${action}`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildStarMessage(action, repoFullName, starredBy);
  await sendNotification(message);
}

/**
 * 处理Fork事件
 */
async function handleForkEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const forker = payload.sender.login;

  console.log(`仓库 ${repoFullName} 的Fork事件`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildForkMessage(repoFullName, forker);
  await sendNotification(message);
}

/**
 * 处理Watch事件（关注/取消关注）
 */
async function handleWatchEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action; // "started" 或 "deleted"
  const watcher = payload.sender.login;

  console.log(`仓库 ${repoFullName} 的Watch事件: ${action}`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildWatchMessage(action, repoFullName, watcher);
  await sendNotification(message);
}

/**
 * 处理Issue事件
 */
async function handleIssueEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action;
  const issue = payload.issue;

  console.log(`仓库 ${repoFullName} 的Issue事件: ${action}`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildIssueMessage(action, repoFullName, issue);
  await sendNotification(message);
}

/**
 * 处理Pull Request事件
 */
async function handlePullRequestEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action;
  const pr = payload.pull_request;

  console.log(`仓库 ${repoFullName} 的PR事件: ${action}`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildPullRequestMessage(action, repoFullName, pr);
  await sendNotification(message);
}

/**
 * 处理Release事件
 */
async function handleReleaseEvent(payload) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action;
  const release = payload.release;

  console.log(`仓库 ${repoFullName} 的Release事件: ${action}`);

  // 检查仓库是否在允许列表中
  if (!isRepoAllowed(repoFullName)) {
    console.log(`仓库 ${repoFullName} 不在允许列表中，跳过处理`);
    return;
  }

  const message = buildReleaseMessage(action, repoFullName, release);
  await sendNotification(message);
}

module.exports = async (request, response) => {
  // 只接受POST请求
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    // 在Vercel中，请求体可能已经被解析，我们需要确保它是字符串格式以便验证签名
    let rawPayload;
    if (typeof request.body === 'string') {
      rawPayload = request.body;
    } else if (Buffer.isBuffer(request.body)) {
      rawPayload = request.body.toString('utf8');
    } else {
      rawPayload = JSON.stringify(request.body);
    }

    const signature = request.headers['x-hub-signature-256'];
    const event = request.headers['x-github-event'];

    // 验证Webhook签名（如果设置了密钥）
    if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(
        rawPayload,
        signature,
        process.env.GITHUB_WEBHOOK_SECRET
      );
      
      if (!isValid) {
        console.error('Webhook签名验证失败');
        return response.status(401).send('Unauthorized');
      }
    }

    console.log(`接收到GitHub事件: ${event}`);
    
    // 解析请求体
    const parsedPayload = JSON.parse(rawPayload);
    
    // 根据事件类型处理
    switch (event) {
      case 'ping':
        // 响应ping事件，确认webhook配置成功
        console.log('接收到ping事件，webhook配置验证成功');
        response.status(200).json({ message: 'Webhook配置验证成功', zen: parsedPayload.zen });
        return;
      case 'star':
        await handleStarEvent(parsedPayload);
        break;
      case 'fork':
        await handleForkEvent(parsedPayload);
        break;
      case 'watch':
        await handleWatchEvent(parsedPayload);
        break;
      case 'issues':
        await handleIssueEvent(parsedPayload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(parsedPayload);
        break;
      case 'release':
        await handleReleaseEvent(parsedPayload);
        break;
      default:
        console.log(`未处理的事件类型: ${event}`);
        break;
    }
    
    response.status(200).json({ message: 'Webhook处理成功' });
  } catch (error) {
    console.error('处理Webhook事件时出错:', error);
    console.error('错误堆栈:', error.stack);
    response.status(500).json({ error: error.message });
  }
};