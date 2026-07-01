/**
 * GitHub Build Service
 * Handles build command logic using GitHub App Installation tokens
 */

const { logger } = require("../utils/logger");
const crypto = require("crypto");

class GitHubBuildService {
  /**
   * Generates a JSON Web Token (JWT) signed with RS256 using the GitHub App private key.
   * @returns {string} Signed JWT
   */
  generateJWT() {
    const appId = process.env.GITHUB_APP_ID || "2596089";
    const rawPrivateKey = process.env.GITHUB_PRIVATE_KEY;
    
    if (!rawPrivateKey) {
      throw new Error("GITHUB_PRIVATE_KEY environment variable is missing.");
    }
    
    // Replace escaped newlines with actual newlines to support Vercel multi-line environment variables
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 1 minute in the past to account for clock drift
      exp: now + 540, // 9 minutes in the future (max limit is 10 minutes)
      iss: appId
    };

    const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

    const data = `${headerEncoded}.${payloadEncoded}`;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(data), privateKey);
    const signatureEncoded = signature.toString("base64url");

    return `${data}.${signatureEncoded}`;
  }

  /**
   * Fetches the short-lived installation access token for a specific repository.
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number|null} installationId - Optional installation ID
   * @returns {Promise<string>} Access token
   */
  async getInstallationAccessToken(owner, repo, installationId = null) {
    const jwt = this.generateJWT();
    let targetInstallationId = installationId;

    if (!targetInstallationId) {
      const instUrl = `https://api.github.com/repos/${owner}/${repo}/installation`;
      const instRes = await fetch(instUrl, {
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

      const instData = await instRes.json();
      targetInstallationId = instData.id;
    }

    const tokenUrl = `https://api.github.com/app/installations/${targetInstallationId}/access_tokens`;
    const tokenRes = await fetch(tokenUrl, {
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

    const tokenData = await tokenRes.json();
    return tokenData.token;
  }

  /**
   * Handle build command using GitHub App authentication
   * @param {Object} params - Build parameters
   */
  async handleBuildCommand(params) {
    const { args, owner, repo, prNumber, comment, sender, installationId } = params;

    if (!args) {
      return { success: false, error: "build command requires package name", errorCode: "MISSING_PACKAGE_NAME" };
    }

    const { packageName, options } = this.parseBuildArgs(args);
    logger.info(`Executing build command: ${packageName} for PR #${prNumber} in ${owner}/${repo}`);

    try {
      // 1. Get access token for the PR comment repository (for adding reaction)
      const sourceRepoToken = await this.getInstallationAccessToken(owner, repo, installationId);

      // 2. Get access token for GHA runner repository to trigger workflow
      const targetOwner = "lonerOrz";
      const targetRepo = "nixpkgs-review-gha";
      const targetRepoToken = await this.getInstallationAccessToken(targetOwner, targetRepo);

      // 3. Trigger workflow
      const success = await this.triggerWorkflow(owner, repo, prNumber, packageName, targetRepoToken, options);

      // 4. Post reaction to comment
      await this.addReactionToComment(comment.id, success, owner, repo, sourceRepoToken);

      return success 
        ? { success: true, message: `Successfully triggered build for ${packageName}` } 
        : { success: false, error: "Failed to trigger build" };
    } catch (err) {
      // Wrap the Error object in a plain object so JSON.stringify can serialize it
      logger.error("Error in handleBuildCommand:", {
        error_message: err.message,
        error_stack: err.stack
      });
      return { success: false, error: err.message };
    }
  }

  parseBuildArgs(args) {
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

  async triggerWorkflow(owner, repo, prNumber, packageName, token, options = {}) {
    const targetOwner = "lonerOrz";
    const targetRepo = "nixpkgs-review-gha";
    const url = `https://api.github.com/repos/${targetOwner}/${targetRepo}/actions/workflows/build-pr.yml/dispatches`;

    const response = await fetch(url, {
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

  async addReactionToComment(commentId, success, owner, repo, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`;
    await fetch(url, {
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
}

module.exports = new GitHubBuildService();
