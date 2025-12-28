const { PluginInterface } = require('../utils/pluginSystem');

/**
 * 帮助插件
 * 提供 /help 命令和其他辅助功能
 */
class HelpPlugin extends PluginInterface {
  constructor() {
    super('help', '帮助插件 - 提供 /help 命令');
    // 定义插件的命令元数据
    this.commands = [
      {
        command: 'help',
        description: '显示帮助信息'
      }
    ];
  }

  async onCommand(command, bot, msg) {
    if (command === '/help') {
      const helpMessage = `
🤖 机器人帮助信息

可用命令：
/help - 显示此帮助信息
/greet - 插件提供的问候命令

其他命令（非插件）：
/hello - 问候命令
/dice - 掷骰子
/checkbot - 检查机器人权限
/testverify - 测试验证逻辑
      `;
      
      await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
      return true;
    }
    return false;
  }
}

module.exports = HelpPlugin;