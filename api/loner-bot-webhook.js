/**
 * GitHub Issue/PR Webhook监听器
 * 监听GitHub issue_comment 事件，并使用GitHub命令服务处理命令
 */

const { info, warn, error, debug } = require("../utils/logger");
const crypto = require('crypto');
const githubCommandService = require("../services/github-command-service");

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
      // 使用GitHub命令服务处理评论
      const result = await githubCommandService.handleIssueComment(payload);

      if (result) {
        // 如果有处理结果，返回相应的响应
        if (result.success) {
          response.status(200).json({
            message: result.message,
            command: result.command,
            packageName: result.packageName,
            prNumber: result.prNumber,
            receivedAt: Date.now()
          });
        } else {
          // 根据错误代码返回不同的HTTP状态码
          let statusCode = 500;
          if (result.errorCode === 'UNAUTHORIZED_USER') {
            statusCode = 403; // Forbidden
          } else if (result.errorCode === 'NOT_A_PR') {
            statusCode = 200; // OK, but no action taken
          } else if (result.errorCode === 'MISSING_PACKAGE_NAME') {
            statusCode = 400; // Bad Request
          }

          response.status(statusCode).json({
            error: result.error,
            errorCode: result.errorCode,
            receivedAt: Date.now()
          });
        }
      } else {
        // 没有匹配的命令，返回成功但无操作
        response.status(200).json({
          message: 'Webhook已接收，但未检测到支持的命令',
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