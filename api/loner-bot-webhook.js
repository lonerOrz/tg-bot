/**
 * GitHub Issue/PR Webhook监听器
 * 监听GitHub issue_comment 事件，检测 @loneros-bot build <pkg name> 命令并触发工作流
 */

const { info, warn, error, debug } = require("../utils/logger");
const crypto = require('crypto');

/**
 * 验证GitHub Webhook请求的签名
 * @param {string} payload - 请求体
 * @param {string} signature - GitHub发送的签名
 * @param {string} secret - Webhook密钥
 * @returns {boolean} 签名是否有效
 */
function verifySignature(payload, signature, secret) {
  if (!secret) {
    // 如果没有设置密钥，则跳过验证
    return true;
  }

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
 * 触发GitHub Actions工作流
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @param {number} prNumber - PR编号
 * @param {string} packageName - 包名称
 * @param {string} token - GitHub个人访问令牌
 * @returns {Promise<boolean>} 是否成功触发工作流
 */
async function triggerWorkflow(owner, repo, prNumber, packageName, token) {
  try {
    const workflowId = 'build-pr.yml'; // 默认工作流文件名

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main', // 或者使用目标分支，可以从环境变量获取
        inputs: {
          "repo": `${owner}/${repo}`,
          "pr-number": prNumber.toString(),
          "packages": packageName,
          "x86_64-linux": true,
          "aarch64-linux": true,
          "x86_64-darwin": "yes_sandbox_relaxed",
          "aarch64-darwin": "yes_sandbox_relaxed",
          "upterm": false,
          "post-result": true
        }
      })
    });

    if (response.ok) {
      info(`成功触发工作流: ${packageName} for PR #${prNumber}`);
      return true;
    } else {
      const errorData = await response.json();
      error(`触发工作流失败:`, errorData);
      return false;
    }
  } catch (err) {
    error(`触发工作流时出错:`, err.message);
    return false;
  }
}

module.exports = async (request, response) => {
  // 只接受POST请求
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed', supportedMethods: ['POST'] });
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
    const webhookSecret = process.env.GITHUB_BOT_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifySignature(
        rawPayload,
        signature,
        webhookSecret
      );

      if (!isValid) {
        console.error('Webhook签名验证失败');
        return response.status(401).send('Unauthorized');
      }
    }

    // 解析请求体
    const payload = JSON.parse(rawPayload);

    // 记录请求信息
    info(`接收到GitHub事件: ${event}`);
    info("请求头:", JSON.stringify(request.headers));

    // 检查是否是issue_comment事件
    if (event === 'issue_comment') {
      const comment = payload.comment;
      const issue = payload.issue;
      const repository = payload.repository;
      const sender = payload.sender;

      info(`收到评论事件: 仓库=${repository.full_name}, 发送者=${sender.login}, 评论ID=${comment.id}`);

      // 检查评论内容是否包含@loneros-bot build命令
      const commentBody = comment.body || '';
      const buildCommandMatch = commentBody.match(/@loneros-bot\s+build\s+(\S+)/i);

      if (buildCommandMatch) {
        const packageName = buildCommandMatch[1];
        info(`检测到build命令: ${packageName} 由 ${sender.login} (ID: ${sender.id}) 在 ${repository.full_name} 中触发`);

        // 检查发送者是否在允许的用户ID列表中
        const allowedUserIds = process.env.GITHUB_ALLOWED_USER_IDS
          ? process.env.GITHUB_ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
          : [];

        if (allowedUserIds.length > 0 && !allowedUserIds.includes(sender.id)) {
          info(`用户 ${sender.login} (ID: ${sender.id}) 未在允许的用户列表中，拒绝执行构建命令`);
          return response.status(403).json({
            error: 'Forbidden',
            message: `用户 ${sender.login} 没有权限触发构建命令`
          });
        }

        // 检查是否是PR
        const isPR = issue.pull_request !== undefined;
        if (isPR) {
          const prNumber = issue.number;
          const owner = repository.owner.login;
          const repo = repository.name;

          info(`处理PR #${prNumber}: ${packageName} from ${owner}/${repo}`);

          // 获取GitHub token
          const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
          if (!githubToken) {
            error('未设置GH_TOKEN或GITHUB_TOKEN环境变量');
            return response.status(500).json({
              error: 'Missing GH_TOKEN or GITHUB_TOKEN environment variable',
              message: '无法触发工作流，因为缺少GitHub个人访问令牌'
            });
          }

          // 触发工作流
          const success = await triggerWorkflow(owner, repo, prNumber, packageName, githubToken);
          if (success) {
            response.status(200).json({
              message: `已成功触发 ${packageName} 的构建工作流`,
              packageName,
              prNumber,
              repository: `${owner}/${repo}`,
              receivedAt: Date.now()
            });
          } else {
            response.status(500).json({
              error: 'Failed to trigger workflow',
              message: `无法触发 ${packageName} 的构建工作流`
            });
          }
        } else {
          // 如果不是PR而是普通issue
          info(`评论在普通issue中，不是PR，跳过构建命令: ${issue.number}`);
          response.status(200).json({
            message: '评论在普通issue中，不是PR，跳过构建命令',
            issueNumber: issue.number,
            receivedAt: Date.now()
          });
        }
      } else {
        // 没有检测到build命令，只记录信息
        info(`评论中未检测到@loneros-bot build命令: ${commentBody.substring(0, 100)}...`);
        response.status(200).json({
          message: 'Webhook已接收，但未检测到build命令',
          receivedAt: Date.now()
        });
      }
    } else {
      // 非issue_comment事件，记录并返回
      info(`接收到非issue_comment事件: ${event}`);
      response.status(200).json({
        message: `Webhook已接收${event}事件，但仅处理issue_comment事件`,
        eventType: event,
        receivedAt: Date.now()
      });
    }
  } catch (err) {
    error("处理请求时出错:", err.message);
    error("错误堆栈:", err.stack);
    response.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      receivedAt: Date.now()
    });
  }
};