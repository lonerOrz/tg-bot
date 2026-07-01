/**
 * GitHub Build Webhook Entry Point
 * Handles PR build command triggers using GitHub App Installation context
 */
const githubBuildService = require("../services/github-build-service");
const { logger } = require("../utils/logger");
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret)
          .update(payload, 'utf8')
          .digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
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
    const webhookSecret = process.env.GITHUB_BOT_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;

    if (webhookSecret) {
      if (!signature || !verifySignature(rawPayload, signature, webhookSecret)) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
    }

    const payload = JSON.parse(rawPayload);
    const event = request.headers['x-github-event'];

    if (event === 'issue_comment' && payload.action === 'created') {
      const commentBody = payload.comment.body || "";
      const match = commentBody.match(/@loneros-bot\s+build\s+(.+)/i);

      if (match) {
        const result = await githubBuildService.handleBuildCommand({
          args: match[1],
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          prNumber: payload.issue.number,
          comment: payload.comment,
          sender: payload.sender,
          installationId: payload.installation ? payload.installation.id : null
        });
        return response.status(result.success ? 200 : 500).json(result);
      }
    }
    
    response.status(200).json({ message: 'No command processed' });
  } catch (err) {
    logger.error("GitHub Build Webhook Error:", err);
    response.status(500).json({ error: err.message });
  }
};
