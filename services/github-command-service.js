/**
 * GitHub命令服务
 * 处理GitHub issue_comment事件中的命令
 */

const { info, warn, error } = require("../utils/logger");

class GitHubCommandService {
  constructor() {
    // 定义可用的命令
    this.commands = {
      build: this.handleBuildCommand.bind(this),
      // 将来可以添加更多命令
      // 'test': this.handleTestCommand.bind(this),
      // 'deploy': this.handleDeployCommand.bind(this),
    };
  }

  /**
   * 处理GitHub issue_comment事件
   * @param {Object} payload - GitHub webhook payload
   * @returns {Object|null} 处理结果或null（如果没有匹配的命令）
   */
  async handleIssueComment(payload) {
    const comment = payload.comment;
    const issue = payload.issue;
    const repository = payload.repository;
    const sender = payload.sender;
    const action = payload.action; // 添加操作类型检查

    // 只处理创建评论的操作
    if (action !== 'created') {
      info(`评论事件操作类型为 ${action}，跳过处理`);
      return null;
    }

    info(
      `收到评论事件: 仓库=${repository.full_name}, 发送者=${sender.login}, 评论ID=${comment.id}`,
    );

    // 检查评论内容是否包含机器人命令
    const commentBody = comment.body || "";
    const commandMatch = this.parseCommand(commentBody);

    if (commandMatch) {
      const { command, args } = commandMatch;

      // 检查发送者是否在允许的用户ID列表中
      const allowedUserIds = process.env.GITHUB_ALLOWED_USER_IDS
        ? process.env.GITHUB_ALLOWED_USER_IDS.split(",").map((id) =>
          parseInt(id.trim()),
        )
        : [];

      if (allowedUserIds.length > 0 && !allowedUserIds.includes(sender.id)) {
        info(
          `用户 ${sender.login} (ID: ${sender.id}) 未在允许的用户列表中，拒绝执行命令`,
        );
        return {
          success: false,
          error: `用户 ${sender.login} 没有权限执行命令`,
          errorCode: "UNAUTHORIZED_USER",
        };
      }

      // 检查是否是PR
      const isPR = issue.pull_request !== undefined;
      if (!isPR) {
        info(`评论在普通issue中，不是PR，跳过命令: ${issue.number}`);
        return {
          success: false,
          error: "命令只能在PR中执行",
          errorCode: "NOT_A_PR",
        };
      }

      // 执行对应的命令处理器
      const commandHandler = this.commands[command];
      if (commandHandler) {
        return await commandHandler({
          owner: repository.owner.login,
          repo: repository.name,
          prNumber: issue.number,
          args,
          sender,
          comment,
          issue,
          repository,
        });
      } else {
        info(`未知命令: ${command}`);
        return {
          success: false,
          error: `未知命令: ${command}`,
          errorCode: "UNKNOWN_COMMAND",
        };
      }
    }

    // 没有检测到命令
    return null;
  }

  /**
   * 解析评论中的命令
   * @param {string} commentBody - 评论内容
   * @returns {Object|null} 解析出的命令对象或null
   */
  parseCommand(commentBody) {
    // 匹配 @loneros-bot <command> <args> 格式
    const commandPattern = /@loneros-bot\s+(\w+)(?:\s+(.+))?/i;
    const match = commentBody.match(commandPattern);

    if (match) {
      const command = match[1].toLowerCase();
      const args = match[2] ? match[2].trim() : "";
      return { command, args };
    }

    return null;
  }

  /**
   * 处理build命令
   * @param {Object} params - 命令参数
   * @returns {Object} 处理结果
   */
  async handleBuildCommand(params) {
    const { args, owner, repo, prNumber } = params;

    if (!args) {
      return {
        success: false,
        error: "build命令需要指定包名",
        errorCode: "MISSING_PACKAGE_NAME",
      };
    }

    // 解析命令参数
    const { packageName, options } = this.parseBuildArgs(args);
    info(
      `执行build命令: ${packageName} for PR #${prNumber} in ${owner}/${repo} with options:`,
      options,
    );

    // 触发GitHub Actions工作流
    const success = await this.triggerWorkflow(
      owner,
      repo,
      prNumber,
      packageName,
      options,
    );

    if (success) {
      return {
        success: true,
        message: `已成功触发 ${packageName} 的构建工作流`,
        command: "build",
        packageName,
        prNumber,
        options,
      };
    } else {
      return {
        success: false,
        error: `无法触发 ${packageName} 的构建工作流`,
        errorCode: "WORKFLOW_TRIGGER_FAILED",
      };
    }
  }

  /**
   * 解析build命令参数
   * @param {string} args - 命令参数字符串
   * @returns {Object} 包含包名和选项的对象
   */
  parseBuildArgs(args) {
    // 分割参数
    const tokens = args.trim().split(/\s+/);
    const packageName = tokens[0]; // 第一个参数是包名

    // 默认选项
    const defaultOptions = {
      "x86_64-linux": true,
      "aarch64-linux": true,
      "x86_64-darwin": "yes_sandbox_relaxed",
      "aarch64-darwin": "yes_sandbox_relaxed",
      upterm: false,
      "post-result": true,
    };

    // 简写映射
    const shorthandMap = {
      x86: "x86_64-linux",
      aarch: "aarch64-linux",
      x86d: "x86_64-darwin",
      aarchd: "aarch64-darwin",
      term: "upterm",
      result: "post-result",
    };

    // 解析选项
    const options = { ...defaultOptions };
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.startsWith("+")) {
        // 启用选项，如 +x86 或 +x86d
        const key = token.substring(1);
        const actualKey = shorthandMap[key] || key;
        if (typeof defaultOptions[actualKey] === "boolean") {
          // 对于布尔值，+表示true
          options[actualKey] = true;
        } else {
          // 对于非布尔值，+表示使用默认值
          options[actualKey] = defaultOptions[actualKey];
        }
      } else if (token.startsWith("-")) {
        // 禁用选项，如 -x86 或 -x86d
        const key = token.substring(1);
        const actualKey = shorthandMap[key] || key;
        if (typeof defaultOptions[actualKey] === "boolean") {
          // 对于布尔值，-表示false
          options[actualKey] = false;
        } else {
          // 对于非布尔值，-表示"no"
          options[actualKey] = "no";
        }
      } else if (token.startsWith("--")) {
        // 长格式选项，如 --x86_64-linux false
        const [key, value] = token.substring(2).split("=");
        if (key && value !== undefined) {
          const actualKey = shorthandMap[key] || key;
          options[actualKey] = this.parseOptionValue(value);
        } else if (
          tokens[i + 1] &&
          !tokens[i + 1].startsWith("--") &&
          !tokens[i + 1].startsWith("-") &&
          !tokens[i + 1].startsWith("+")
        ) {
          // 有单独值的选项
          const actualKey =
            shorthandMap[token.substring(2)] || token.substring(2);
          options[actualKey] = this.parseOptionValue(tokens[i + 1]);
          i++; // 跳过下一个token，因为它已经被用作值
        } else {
          // 没有值的布尔选项，设为true
          const actualKey =
            shorthandMap[token.substring(2)] || token.substring(2);
          options[actualKey] = true;
        }
      }
    }

    return { packageName, options };
  }

  /**
   * 解析选项值
   * @param {string} value - 选项值
   * @returns {boolean|string} 解析后的值
   */
  parseOptionValue(value) {
    if (value === "true" || value === "1" || value === "yes") {
      return true;
    } else if (value === "false" || value === "0" || value === "no") {
      return false;
    }
    // 对于非布尔值，直接返回原值
    return value;
  }

  /**
   * 触发GitHub Actions工作流
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @param {string} packageName - 包名称
   * @param {Object} options - 构建选项
   * @returns {Promise<boolean>} 是否成功触发工作流
   */
  async triggerWorkflow(owner, repo, prNumber, packageName, options = {}) {
    try {
      // 使用硬编码的仓库和工作流路径
      const targetOwner = "lonerOrz";
      const targetRepo = "nixpkgs-review-gha";
      const workflowId = "build-pr.yml"; // 工作流文件名
      const url = `https://api.github.com/repos/${targetOwner}/${targetRepo}/actions/workflows/${workflowId}/dispatches`;

      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
      if (!token) {
        error("未设置GH_TOKEN或GITHUB_TOKEN环境变量");
        return false;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main", // 或者使用目标分支，可以从环境变量获取
          inputs: {
            repo: `${owner}/${repo}`, // 使用原始PR的仓库信息
            "pr-number": prNumber.toString(), // 使用原始PR号
            packages: packageName,
            "x86_64-linux": options["x86_64-linux"],
            "aarch64-linux": options["aarch64-linux"],
            "x86_64-darwin": options["x86_64-darwin"],
            "aarch64-darwin": options["aarch64-darwin"],
            upterm: options["upterm"],
            "post-result": options["post-result"],
          },
        }),
      });

      if (response.ok) {
        info(
          `成功触发工作流: ${packageName} for PR #${prNumber} in ${owner}/${repo} with options:`,
          options,
        );
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

  /**
   * 获取可用命令列表
   * @returns {Array} 可用命令列表
   */
  getAvailableCommands() {
    return Object.keys(this.commands);
  }

  /**
   * 获取命令帮助信息
   * @param {string} command - 命令名称
   * @returns {string} 帮助信息
   */
  getCommandHelp(command) {
    const helpInfo = {
      build: "@loneros-bot build <package-name> - 构建指定的包",
      // 将来可以添加更多命令的帮助信息
    };

    return helpInfo[command] || `未知命令: ${command}`;
  }
}

module.exports = new GitHubCommandService();
