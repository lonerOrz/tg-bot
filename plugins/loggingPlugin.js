const { PluginInterface } = require('../utils/pluginSystem');
const { BotEvent } = require('../utils/eventBus');
const { info, warn, error } = require('../utils/logger');

/**
 * 日志插件
 * 监听各种事件并记录日志
 */
class LoggingPlugin extends PluginInterface {
  constructor() {
    super('logging', '日志插件 - 记录机器人活动');
    // 日志插件不提供命令，只监听事件
    this.commands = [];
  }

  async initialize(container, eventBus) {
    await super.initialize(container, eventBus);
    
    // 订阅各种事件
    eventBus.subscribe(BotEvent.MESSAGE_RECEIVED, this.onMessageReceived.bind(this));
    eventBus.subscribe(BotEvent.COMMAND_EXECUTED, this.onCommandExecuted.bind(this));
    eventBus.subscribe(BotEvent.ERROR_OCCURRED, this.onErrorOccurred.bind(this));
    eventBus.subscribe(BotEvent.VERIFICATION_STARTED, this.onVerificationStarted.bind(this));
    eventBus.subscribe(BotEvent.VERIFICATION_COMPLETED, this.onVerificationCompleted.bind(this));
  }

  async onMessageReceived(data) {
    info(`[日志插件] 消息接收: 用户 ${data.userId} 在 ${data.chatId} 发送了消息 "${data.text}"`);
  }

  async onCommandExecuted(data) {
    info(`[日志插件] 命令执行: ${data.command} 由用户 ${data.userId} 在 ${data.chatId} 执行`);
  }

  async onErrorOccurred(data) {
    error(`[日志插件] 错误发生: ${data.error}\n${data.stack}`);
  }

  async onVerificationStarted(data) {
    info(`[日志插件] 验证开始: 群组 ${data.chatId} 有 ${data.newMembers?.length} 个新成员`);
  }

  async onVerificationCompleted(data) {
    info(`[日志插件] 验证完成: 用户 ${data.userId} 验证结果 ${data.success ? '成功' : '失败'}`);
  }

  async onMessage(bot, msg) {
    // 插件也可以处理普通消息
    if (msg.text && msg.text.toLowerCase().includes('log')) {
      await bot.sendMessage(msg.chat.id, '日志插件正在运行中...');
      return true;
    }
    return false;
  }
}

module.exports = LoggingPlugin;