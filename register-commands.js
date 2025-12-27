/**
 * 命令注册脚本
 * 用于向 Telegram 注册机器人命令
 */

const TelegramBot = require('node-telegram-bot-api');
const { registerBotCommands } = require('./commands/registerCommands');
const config = require('./config');

if (!config.telegramToken) {
  console.error('错误: 未设置 TELEGRAM_TOKEN 环境变量');
  process.exit(1);
}

// 创建机器人实例
const bot = new TelegramBot(config.telegramToken);

console.log('开始注册机器人命令...');

// 注册命令
registerBotCommands(bot)
  .then(success => {
    if (success) {
      console.log('所有命令注册成功！');
    } else {
      console.log('命令注册失败！');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('注册命令时出错:', error);
    process.exit(1);
  });