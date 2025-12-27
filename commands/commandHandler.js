/**
 * 命令处理器模块
 * 使用策略模式统一管理所有命令
 */

const { checkGroupWhitelistForCommand } = require('../services/permissionService');

class CommandHandler {
  /**
   * 创建命令处理器实例
   */
  constructor() {
    this.commands = new Map();
  }

  /**
   * 注册命令处理器
   * @param {string} command - 命令名称（如 '/hello'）
   * @param {Function} handler - 命令处理器函数
   * @param {Object} options - 命令选项
   * @param {boolean} options.requiresGroup - 是否仅限群组使用
   * @param {boolean} options.requiresWhitelist - 是否需要白名单验证
   */
  register(command, handler, options = {}) {
    this.commands.set(command.toLowerCase(), { handler, options });
    return this;
  }

  /**
   * 执行命令
   * @param {Object} bot - Telegram Bot 实例
   * @param {Object} msg - 消息对象
   * @returns {Promise<boolean>} - 是否成功执行了命令
   */
  async execute(bot, msg) {
    if (!msg.text) return false;

    const text = msg.text.trim();
    const cmd = text.split(' ')[0].split('@')[0].toLowerCase();

    const command = this.commands.get(cmd);
    if (!command) {
      return false;
    }

    const { handler, options } = command;
    
    // 根据选项执行相应验证
    if (options.requiresWhitelist) {
      // 验证是否在允许的群组中
      if (msg.chat.type.includes('group')) {
        checkGroupWhitelistForCommand(msg);
      }
    }

    if (options.requiresGroup && !msg.chat.type.includes('group')) {
      await bot.sendMessage(msg.chat.id, '⚠️ 此命令只能在群组中使用。');
      return true; // 已处理，但执行失败
    }

    try {
      await handler(bot, msg);
      return true;
    } catch (error) {
      console.error(`执行命令 ${cmd} 时出错:`, error);
      throw error;
    }
  }

  /**
   * 获取所有注册的命令
   * @returns {Array<string>} - 命令列表
   */
  getCommands() {
    return Array.from(this.commands.keys());
  }
}

module.exports = new CommandHandler();