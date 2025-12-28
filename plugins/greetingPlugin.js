const { PluginInterface } = require('../utils/pluginSystem');

/**
 * 问候插件
 * 演示插件系统的基本功能 - 提供 /greet 命令
 */
class GreetingPlugin extends PluginInterface {
  constructor() {
    super('greeting', '问候插件 - 提供 /greet 命令');
    // 定义插件的命令元数据
    this.commands = [
      {
        command: 'greet',
        description: '提供个性化问候'
      }
    ];
  }

  async onCommand(command, bot, msg) {
    if (command === '/greet') {
      await bot.sendMessage(msg.chat.id, '👋 你好！欢迎使用机器人插件系统！');
      return true;
    }
    return false;
  }
}

module.exports = GreetingPlugin;