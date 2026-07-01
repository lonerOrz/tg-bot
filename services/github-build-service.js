/**
 * GitHub 构建服务
 * 处理构建命令的逻辑
 */

const { logger } = require("../utils/logger");

class GitHubBuildService {
  /**
   * 处理 build 命令
   * @param {Object} params - 构建参数
   */
  async handleBuildCommand(params) {
    const { args, owner, repo, prNumber, comment, sender } = params;

    if (!args) {
      return { success: false, error: "build命令需要指定包名", errorCode: "MISSING_PACKAGE_NAME" };
    }

    const { packageName, options } = this.parseBuildArgs(args);
    logger.info(`执行 build 命令: ${packageName} for PR #${prNumber} in ${owner}/${repo}`);

    const success = await this.triggerWorkflow(owner, repo, prNumber, packageName, options);
    await this.addReactionToComment(comment.id, success, owner, repo, sender);

    return success ? { success: true, message: `已成功触发 ${packageName} 的构建` } : { success: false, error: "触发构建失败" };
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

  async triggerWorkflow(owner, repo, prNumber, packageName, options = {}) {
    const targetOwner = "lonerOrz";
    const targetRepo = "nixpkgs-review-gha";
    const url = `https://api.github.com/repos/${targetOwner}/${targetRepo}/actions/workflows/build-pr.yml/dispatches`;
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) return false;

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

  async addReactionToComment(commentId, success, owner, repo, sender) {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) return;
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`;
    await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/vnd.github.v3+json', 
        'Content-Type': 'application/json',
        'User-Agent': 'telegram-bot-loneros'
      },
      body: JSON.stringify({ content: success ? '+1' : '-1' })
    });
  }
}

module.exports = new GitHubBuildService();
