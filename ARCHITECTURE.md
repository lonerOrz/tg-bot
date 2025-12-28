# 机器人架构说明

本项目实现了现代化的架构设计，包括依赖注入容器、事件驱动架构和插件系统。

## 架构组件

### 1. 依赖注入容器 (DI Container)

**位置**: `utils/diContainer.js`, `utils/container.js`

**功能**:
- 管理所有服务的生命周期
- 解析和注入服务依赖
- 支持单例和多例模式
- 通过 `utils/container.js` 提供应用范围内的共享实例

**使用方式**:
```javascript
const container = require('../utils/container');

// 注册服务
container.register('bot', () => new TelegramBot(config.telegramToken), true);

// 解析服务
const bot = container.resolve('bot');
```

### 2. 事件驱动架构 (Event-Driven Architecture)

**位置**: `utils/eventBus.js`

**功能**:
- 实现组件间松耦合通信
- 支持事件发布/订阅模式
- 定义了机器人事件类型

**事件类型**:
- `message.received` - 消息接收事件
- `command.executed` - 命令执行事件
- `error.occurred` - 错误发生事件
- `verification.started` - 验证开始事件
- `verification.completed` - 验证完成事件

**使用方式**:
```javascript
// 订阅事件
eventBus.subscribe(BotEvent.MESSAGE_RECEIVED, async (data) => {
  console.log(`收到消息: ${data.text}`);
});

// 发布事件
await eventBus.emit(BotEvent.MESSAGE_RECEIVED, {
  text: msg.text,
  chatId: msg.chat.id
});
```

### 3. 插件系统 (Plugin System)

**位置**: `utils/pluginSystem.js`, `plugins/`

**功能**:
- 动态扩展机器人功能
- 支持插件的加载、启用和禁用
- 定义了插件接口规范

**插件接口**:
- `initialize()` - 初始化插件
- `onStart()` - 插件启动
- `onCommand()` - 处理命令
- `onMessage()` - 处理消息
- `onCallbackQuery()` - 处理回调查询

**使用方式**:
```javascript
// 创建插件
class GreetingPlugin extends PluginInterface {
  async onCommand(command, bot, msg) {
    if (command === '/greet') {
      await bot.sendMessage(msg.chat.id, 'Hello!');
      return true;
    }
    return false;
  }
}

// 加载插件
await pluginManager.loadPlugin('./plugins/greetingPlugin.js');
await pluginManager.enablePlugin('greeting');
```

### 4. 健康检查系统

**位置**: `utils/healthCheck.js`, `api/health.js`

**功能**:
- 监控系统各组件的运行状态
- 提供健康检查API端点
- 返回系统健康状况摘要

## 架构优势

1. **解耦**: 组件间通过事件和接口通信，降低耦合度
2. **可扩展**: 通过插件系统轻松添加新功能
3. **可测试**: 依赖注入便于模拟依赖项进行单元测试
4. **模块化**: 功能模块化，便于维护和管理
5. **灵活性**: 可以动态启用/禁用功能
6. **可监控**: 通过健康检查系统监控运行状态
7. **避免循环依赖**: 通过共享容器避免模块间的循环依赖

## 文件结构

```
utils/
├── diContainer.js     # 依赖注入容器类
├── container.js       # 应用范围内的共享容器实例
├── eventBus.js        # 事件总线系统
├── pluginSystem.js    # 插件系统
├── initPlugins.js     # 插件初始化脚本
├── healthCheck.js     # 健康检查工具
plugins/
├── greetingPlugin.js  # 示例问候插件
├── helpPlugin.js      # 示例帮助插件
└── loggingPlugin.js   # 示例日志插件
api/
├── webhook.js         # 主入口文件
└── health.js          # 健康检查API端点
commands/
├── commands.js        # 命令分发器
└── commandHandler.js  # 命令处理器
```

## 集成说明

在 [webhook.js](file:///home/loner/Templates/tg-bot/api/webhook.js) 中，架构组件按以下顺序集成：

1. 从共享容器获取依赖注入容器
2. 初始化事件总线
3. 设置插件管理器
4. 注册核心服务到容器
5. 初始化命令处理器
6. 初始化插件系统（在Promise中）
7. 注册命令（在插件初始化后）
8. 订阅事件处理
9. 在消息处理流程中：
   - 优先使用插件系统处理命令
   - 如果插件未处理，则使用默认命令处理器
   - 事件在 [webhook.js](file:///home/loner/Templates/tg-bot/api/webhook.js) 中统一发布

## 职责分离

- **插件系统**: 处理通过插件实现的命令和功能
- **命令处理器**: 处理核心命令（非插件实现）
- **事件系统**: 负责组件间通信和日志记录
- **依赖注入**: 管理服务生命周期和依赖关系
- **健康检查**: 监控系统各组件运行状态

这种架构使机器人具有高度的可扩展性和可维护性，同时避免了组件间的冲突和循环依赖。