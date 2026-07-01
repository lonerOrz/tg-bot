const config = require("../config");
const crypto = require("crypto");

function generateJWT() {
  const appId = config.githubAppBuild.appId;
  const rawPrivateKey = config.githubAppBuild.privateKey;

  if (!rawPrivateKey) {
    throw new Error("GITHUB_PRIVATE_KEY environment variable is missing.");
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 540, iss: appId };

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(data), privateKey);

  return `${data}.${signature.toString("base64url")}`;
}

async function getInstallationAccessToken(owner, repo, installationId = null) {
  const jwt = generateJWT();
  let targetInstallationId = installationId;

  if (!targetInstallationId) {
    const instRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/installation`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "telegram-bot-loneros"
      }
    });
    if (!instRes.ok) {
      const errText = await instRes.text();
      throw new Error(`Failed to fetch installation ID for ${owner}/${repo}: ${instRes.status} ${errText}`);
    }
    targetInstallationId = (await instRes.json()).id;
  }

  const tokenRes = await fetch(`https://api.github.com/app/installations/${targetInstallationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "telegram-bot-loneros"
    }
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to generate installation access token: ${tokenRes.status} ${errText}`);
  }
  return (await tokenRes.json()).token;
}

function parseBuildArgs(args) {
  const tokens = args.trim().split(/\s+/);
  const packageName = tokens[0];
  const options = { "x86_64-linux": true, "aarch64-linux": true, "x86_64-darwin": "yes_sandbox_relaxed", "aarch64-darwin": "yes_sandbox_relaxed", upterm: false, "post-result": true };

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("-h")) {
      const platformCode = token.substring(2).trim() || tokens[++i];
      if (platformCode && platformCode.length === 4) {
        const [l64, la64, d64, da64] = platformCode.split('');
        options['x86_64-linux'] = l64 === '1';
        options['aarch64-linux'] = la64 === '1';
        options['x86_64-darwin'] = d64 === '1' ? 'yes_sandbox_relaxed' : 'no';
        options['aarch64-darwin'] = da64 === '1' ? 'yes_sandbox_relaxed' : 'no';
      }
    } else if (token === "+u") options.upterm = true;
    else if (token === "-u") options.upterm = false;
    else if (token === "+p") options['post-result'] = true;
    else if (token === "-p") options['post-result'] = false;
  }
  return { packageName, options };
}

async function triggerWorkflow(owner, repo, prNumber, packageName, token, options = {}) {
  const targetOwner = config.githubAppBuild.targetOwner;
  const targetRepo = config.githubAppBuild.targetRepo;

  const response = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/actions/workflows/build-pr.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "telegram-bot-loneros"
    },
    body: JSON.stringify({
      ref: "main",
      inputs: {
        repo: `${owner}/${repo}`,
        "pr-number": prNumber.toString(),
        packages: packageName,
        ...options
      }
    }),
  });
  return response.ok;
}

async function addReactionToComment(commentId, success, owner, repo, token) {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'telegram-bot-loneros'
    },
    body: JSON.stringify({ content: success ? '+1' : '-1' })
  });
}

async function handleBuildCommand(params) {
  const { args, owner, repo, prNumber, comment, installationId } = params;

  if (!args) {
    return { success: false, error: "build command requires package name" };
  }

  const { packageName, options } = parseBuildArgs(args);
  console.log(`Executing build command: ${packageName} for PR #${prNumber} in ${owner}/${repo}`);

  try {
    const sourceRepoToken = await getInstallationAccessToken(owner, repo, installationId);

    const targetOwner = config.githubAppBuild.targetOwner;
    const targetRepo = config.githubAppBuild.targetRepo;
    const targetRepoToken = targetOwner === owner
      ? sourceRepoToken
      : await getInstallationAccessToken(targetOwner, targetRepo);

    const success = await triggerWorkflow(owner, repo, prNumber, packageName, targetRepoToken, options);
    await addReactionToComment(comment.id, success, owner, repo, sourceRepoToken);

    return success
      ? { success: true, message: `Successfully triggered build for ${packageName}` }
      : { success: false, error: "Failed to trigger build" };
  } catch (err) {
    console.error("Error in handleBuildCommand:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { handleBuildCommand };
