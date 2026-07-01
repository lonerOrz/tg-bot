const crypto = require('crypto');
const config = require('../config');
const bot = require('../src/bot');

const NOTIFICATION_USER_ID = config.githubMonitor.notificationUserId;
if (!NOTIFICATION_USER_ID) {
  console.warn('Warning: NOTIFICATION_USER_ID not set, notifications will not be sent');
}

function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret)
          .update(payload, 'utf8')
          .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function isRepoAllowed(repoFullName) {
  return config.githubMonitor.allowedRepos.length === 0 ||
         config.githubMonitor.allowedRepos.includes(repoFullName);
}

async function sendNotification(message) {
  if (!NOTIFICATION_USER_ID) {
    console.log('NOTIFICATION_USER_ID not set, skipping notification');
    return;
  }

  try {
    await bot.api.sendMessage(NOTIFICATION_USER_ID, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
    console.log(`Notification sent to ${NOTIFICATION_USER_ID}`);
  } catch (error) {
    console.error(`Error sending notification to ${NOTIFICATION_USER_ID}:`, error.message);
  }
}

function buildStarMessage(action, repoFullName, starredBy) {
  const actionText = action === 'created' ? '⭐ Star added' : '⭐ Star removed';
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${starredBy}`;
  return `${actionText} [${repoFullName}](${repoUrl}) by [${starredBy}](${userUrl})!\n${repoFullName} is getting more popular! 🚀`;
}

function buildForkMessage(repoFullName, forker) {
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${forker}`;
  return `🧩 Fork [${repoFullName}](${repoUrl}) created by [${forker}](${userUrl})!\n${repoFullName} is being explored! 🔍`;
}

function buildWatchMessage(action, repoFullName, watcher) {
  const actionText = action === 'started' ? '🔔 Started watching' : '🔕 Stopped watching';
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = `https://github.com/${watcher}`;
  return `${actionText} [${repoFullName}](${repoUrl}) by [${watcher}](${userUrl})!\nSomeone is keeping an eye on your project! 👀`;
}

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

function buildPullRequestMessage(action, repoFullName, pr) {
  let actionText;
  let actionIcon;
  let isImportantEvent = false;

  switch (action) {
    case 'opened':
      actionIcon = '🔀';
      actionText = 'Pull Request opened';
      isImportantEvent = true;
      break;
    case 'closed':
      if (pr.merged) {
        actionIcon = '✅';
        actionText = 'Pull Request merged';
      } else {
        actionIcon = '❌';
        actionText = 'Pull Request closed';
      }
      isImportantEvent = true;
      break;
    case 'reopened':
      actionIcon = '🔄';
      actionText = 'Pull Request reopened';
      isImportantEvent = true;
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

  if (!isImportantEvent) {
    return null;
  }

  const repoUrl = `https://github.com/${repoFullName}`;
  const prUrl = `https://github.com/${repoFullName}/pull/${pr.number}`;
  const userUrl = `https://github.com/${pr.user.login}`;
  return `${actionIcon} ${actionText} #${pr.number} in [${repoFullName}](${repoUrl}) by [${pr.user.login}](${userUrl})!\nGreat contribution to your project! 🚀\nLet's keep making ${repoFullName} better! 🌟`;
}

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

async function handleEvent(payload, eventType, messageBuilder, isImportantEvent = true, checkNotificationEnabled = true) {
  const repoFullName = payload.repository.full_name;
  const action = payload.action;

  let isNotificationEnabled = true;
  if (checkNotificationEnabled) {
    switch (eventType) {
      case 'star':
        isNotificationEnabled = config.githubMonitor.enableStarNotifications;
        break;
      case 'fork':
        isNotificationEnabled = config.githubMonitor.enableForkNotifications;
        break;
      case 'watch':
        isNotificationEnabled = config.githubMonitor.enableWatchNotifications;
        break;
      case 'issue':
        isNotificationEnabled = config.githubMonitor.enableIssueNotifications;
        break;
      case 'pullRequest':
        isNotificationEnabled = config.githubMonitor.enablePullRequestNotifications;
        break;
      case 'release':
        isNotificationEnabled = config.githubMonitor.enableReleaseNotifications;
        break;
      default:
        isNotificationEnabled = true;
    }

    if (!isNotificationEnabled) {
      console.log(`${eventType} notifications disabled, skipping`);
      return;
    }
  }

  console.log(`Repo ${repoFullName} ${eventType} event: ${action}`);

  if (!isRepoAllowed(repoFullName)) {
    console.log(`Repo ${repoFullName} not in allowed list, skipping`);
    return;
  }

  const message = messageBuilder(payload);
  if (message !== null && isImportantEvent) {
    await sendNotification(message);
  }
}

async function handleStarEvent(payload) {
  await handleEvent(payload, 'star', (payload) => {
    const action = payload.action;
    const starredBy = payload.sender.login;
    return buildStarMessage(action, payload.repository.full_name, starredBy);
  });
}

async function handleForkEvent(payload) {
  await handleEvent(payload, 'fork', (payload) => {
    const forker = payload.sender.login;
    return buildForkMessage(payload.repository.full_name, forker);
  });
}

async function handleWatchEvent(payload) {
  await handleEvent(payload, 'watch', (payload) => {
    const action = payload.action;
    const watcher = payload.sender.login;
    return buildWatchMessage(action, payload.repository.full_name, watcher);
  });
}

async function handleIssueEvent(payload) {
  await handleEvent(payload, 'issue', (payload) => {
    const issue = payload.issue;
    return buildIssueMessage(payload.action, payload.repository.full_name, issue);
  });
}

async function handlePullRequestEvent(payload) {
  const action = payload.action;
  const isImportantEvent = ['opened', 'closed', 'reopened'].includes(action) ||
                          (action === 'closed' && payload.pull_request.merged);

  await handleEvent(payload, 'pullRequest', (payload) => {
    const pr = payload.pull_request;
    return buildPullRequestMessage(payload.action, payload.repository.full_name, pr);
  }, isImportantEvent);
}

async function handleReleaseEvent(payload) {
  await handleEvent(payload, 'release', (payload) => {
    const release = payload.release;
    return buildReleaseMessage(payload.action, payload.repository.full_name, release);
  });
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
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

    if (process.env.GITHUB_WEBHOOK_SECRET) {
      if (!signature || !verifySignature(rawPayload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
        console.error('Webhook signature verification failed');
        return response.status(401).send('Unauthorized');
      }
    }

    console.log(`Received GitHub event: ${event}`);

    const parsedPayload = JSON.parse(rawPayload);

    switch (event) {
      case 'ping':
        console.log('Ping event received, webhook verified');
        response.status(200).json({ message: 'Webhook verified', zen: parsedPayload.zen });
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
        console.log(`Unhandled event type: ${event}`);
        break;
    }

    response.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    console.error('Error stack:', error.stack);
    response.status(500).json({ error: error.message });
  }
};
