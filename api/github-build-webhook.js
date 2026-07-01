const { handleBuildCommand } = require("../services/github-build-service");
const { verifySignature, parseRawBody } = require("../utils/webhook-verify");

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawPayload = parseRawBody(request);
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
      const match = (payload.comment.body || "").match(/@loneros-bot\s+build\s+(.+)/i);

      if (match) {
        const result = await handleBuildCommand({
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
    console.error("GitHub Build Webhook Error:", err);
    response.status(500).json({ error: err.message });
  }
};
