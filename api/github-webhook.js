const config = require('../config');
const bot = require('../src/bot');
const { verifySignature, parseRawBody } = require('../utils/webhook-verify');

const NOTIFICATION_USER_ID = config.githubMonitor.notificationUserId;

function isRepoAllowed(repoFullName) {
  return config.githubMonitor.allowedRepos.length === 0 ||
         config.githubMonitor.allowedRepos.includes(repoFullName);
}

async function sendNotification(message) {
  if (!NOTIFICATION_USER_ID) return;
  try {
    await bot.api.sendMessage(NOTIFICATION_USER_ID, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error(`Error sending notification:`, error.message);
  }
}

function buildMessage(eventType, action, repoFullName, extra) {
  const repoUrl = `https://github.com/${repoFullName}`;
  const userUrl = extra.userLogin ? `https://github.com/${extra.userLogin}` : '';
  const userRef = extra.userLogin ? `[${extra.userLogin}](${userUrl})` : '';

  switch (eventType) {
    case 'star': {
      const txt = action === 'created' ? 'Star added' : 'Star removed';
      return `⭐ ${txt} [${repoFullName}](${repoUrl}) by ${userRef}!`;
    }
    case 'fork':
      return `🧩 Fork [${repoFullName}](${repoUrl}) created by ${userRef}!`;
    case 'watch': {
      const txt = action === 'started' ? 'Started watching' : 'Stopped watching';
      return `🔔 ${txt} [${repoFullName}](${repoUrl}) by ${userRef}!`;
    }
    case 'issue': {
      const icons = { opened: '📝', closed: '✅', reopened: '🔄' };
      const txt = { opened: 'Issue opened', closed: 'Issue closed', reopened: 'Issue reopened' };
      return `${icons[action] || 'ℹ️'} ${txt[action] || `Issue ${action}`} #${extra.number} in [${repoFullName}](${repoUrl}) by ${userRef}!`;
    }
    case 'pullRequest': {
      const icons = { opened: '🔀', closed: '✅', reopened: '🔄' };
      let txt;
      if (action === 'closed' && extra.merged) txt = 'PR merged';
      else if (action === 'closed') txt = 'PR closed';
      else if (action === 'opened') txt = 'PR opened';
      else if (action === 'reopened') txt = 'PR reopened';
      else return null;
      return `${icons[action] || 'ℹ️'} ${txt} #${extra.number} in [${repoFullName}](${repoUrl}) by ${userRef}!`;
    }
    case 'release': {
      const icons = { published: '🎁', updated: '✏️', deleted: '🗑️', prereleased: '🧪' };
      const tag = extra.tagName || action;
      return `${icons[action] || '🎁'} Release ${action} ${tag} in [${repoFullName}](${repoUrl}) by ${userRef}!`;
    }
    default:
      return null;
  }
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    const rawPayload = parseRawBody(request);
    const signature = request.headers['x-hub-signature-256'];
    const event = request.headers['x-github-event'];

    if (process.env.GITHUB_WEBHOOK_SECRET) {
      if (!signature || !verifySignature(rawPayload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
        return response.status(401).send('Unauthorized');
      }
    }

    const payload = JSON.parse(rawPayload);
    const repoFullName = payload.repository.full_name;

    if (event === 'ping') {
      return response.status(200).json({ message: 'Webhook verified', zen: payload.zen });
    }

    if (!isRepoAllowed(repoFullName)) {
      return response.status(200).json({ message: 'Webhook processed' });
    }

    let message = null;
    let enabled = true;

    switch (event) {
      case 'star':
        enabled = config.githubMonitor.enableStarNotifications;
        if (enabled) message = buildMessage('star', payload.action, repoFullName, { userLogin: payload.sender.login });
        break;
      case 'fork':
        enabled = config.githubMonitor.enableForkNotifications;
        if (enabled) message = buildMessage('fork', payload.action, repoFullName, { userLogin: payload.sender.login });
        break;
      case 'watch':
        enabled = config.githubMonitor.enableWatchNotifications;
        if (enabled) message = buildMessage('watch', payload.action, repoFullName, { userLogin: payload.sender.login });
        break;
      case 'issues':
        enabled = config.githubMonitor.enableIssueNotifications;
        if (enabled) message = buildMessage('issue', payload.action, repoFullName, { userLogin: payload.issue.user.login, number: payload.issue.number });
        break;
      case 'pull_request':
        enabled = config.githubMonitor.enablePullRequestNotifications;
        if (enabled) message = buildMessage('pullRequest', payload.action, repoFullName, { userLogin: payload.pull_request.user.login, number: payload.pull_request.number, merged: payload.pull_request.merged });
        break;
      case 'release':
        enabled = config.githubMonitor.enableReleaseNotifications;
        if (enabled) message = buildMessage('release', payload.action, repoFullName, { userLogin: payload.release.author.login, tagName: payload.release.tag_name });
        break;
    }

    if (message && enabled) {
      await sendNotification(message);
    }

    response.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    response.status(500).json({ error: error.message });
  }
};
