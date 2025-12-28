const TelegramBot = require("node-telegram-bot-api");
const container = require("../utils/container");
const { EventBus, BotEvent } = require("../utils/eventBus");
const { PluginManager } = require("../utils/pluginSystem");
const { initPlugins } = require("../utils/initPlugins");
const config = require("../config");
const { handleCommandError } = require("../services/errorHandler");
const { info, warn, error } = require("../utils/logger");
const path = require('path');
const commandDispatcher = require("../commands/commands");

// 使用共享的容器实例

// 创建事件总线
const eventBus = new EventBus();

// 创建插件管理器
const pluginManager = new PluginManager(container, eventBus);

// 注册核心服务到容器
container.register('bot', () => new TelegramBot(config.telegramToken), true);
container.register('eventBus', () => eventBus, true);
container.register('pluginManager', () => pluginManager, true);

// 初始化机器人实例
const bot = container.resolve('bot');

// 初始化命令处理器
commandDispatcher.initializeCommandHandler(container);

// 初始化插件
initPlugins(pluginManager, path.join(__dirname, '../plugins'))
  .then(async () => {
    // 插件初始化成功后，再注册命令（包含插件命令）
    const { registerBotCommands } = require("../commands/registerCommands");
    await registerBotCommands(bot, pluginManager).catch(err => {
      console.error('命令注册失败或不需要重复注册:', err.message);
    });
  })
  .catch(err => {
    console.error('插件初始化失败:', err);
    // 即使插件初始化失败，也要尝试注册核心命令
    const { registerBotCommands } = require("../commands/registerCommands");
    registerBotCommands(bot, pluginManager).catch(err => {
      console.error('命令注册失败或不需要重复注册:', err.message);
    });
  });

// 订阅事件
eventBus.subscribe(BotEvent.MESSAGE_RECEIVED, async (data) => {
  info(`收到消息: ${data.text} from ${data.chatId}`);
});

eventBus.subscribe(BotEvent.COMMAND_EXECUTED, async (data) => {
  info(`执行命令: ${data.command} by ${data.userId}`);
});

eventBus.subscribe(BotEvent.ERROR_OCCURRED, async (data) => {
  error(`发生错误:`, data.error);
});

// 不再导出容器以避免循环依赖问题
module.exports = async (request, response) => {
  try {
    const { body } = request;

    // 处理新成员加入或回调查询
    if (body.message?.new_chat_members || body.callback_query) {
      if (body.callback_query) {
        // 尝试使用插件系统处理回调查询
        const handled = await pluginManager.handleCallbackQuery(bot, body.callback_query).catch(err => {
          console.error('插件处理回调查询时出错:', err);
          return false;
        });
        
        if (!handled) {
          // 如果插件没有处理，使用默认处理器
          const handleVerify = require("../commands/verify");
          await handleVerify(bot, body);
        }
      } else if (body.message?.new_chat_members) {
        // 发布验证开始事件
        await eventBus.emit(BotEvent.VERIFICATION_STARTED, {
          newMembers: body.message.new_chat_members,
          chatId: body.message.chat.id
        });
        
        const handleVerify = require("../commands/verify");
        await handleVerify(bot, body);
      }
    }
    
    // 处理文本消息
    if (body.message?.text) {
      // 发布消息接收事件
      await eventBus.emit(BotEvent.MESSAGE_RECEIVED, {
        text: body.message.text,
        chatId: body.message.chat.id,
        userId: body.message.from?.id
      });

      // 首先尝试使用插件系统处理命令
      const text = body.message.text.trim();
      const cmd = text.split(' ')[0].split('@')[0];
      
      const commandHandled = await pluginManager.executeCommand(cmd, bot, body.message).catch(err => {
        console.error('插件处理命令时出错:', err);
        return false;
      });
      
      if (!commandHandled) {
        // 如果插件没有处理命令，使用默认命令处理器
        await commandDispatcher(bot, body.message);
      }
    }

  } catch (error) {
    // 发布错误事件
    await eventBus.emit(BotEvent.ERROR_OCCURRED, {
      error: error.message,
      stack: error.stack
    });
    
    await handleCommandError(bot, request, error);
  } finally {
    response.status(200).send("OK");
  }
};