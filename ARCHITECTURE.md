# 机器人架构说明

本项目基于 [grammy](https://grammy.dev/) 框架实现，采用现代、简洁的 Node.js 异步架构。相较于旧版插件式架构，新架构更加直观且易于维护。

## 核心架构原则

1.  **Middleware-First**: 机器人的所有行为均通过 `grammy` 的中间件（Middleware）机制处理。
2.  **模块化命令**: 每个命令对应一个独立的模块，通过在 `src/bot.js` 中统一注册来管理。
3.  **状态管理**: 利用 `grammy` 内置的 `session` 处理对话上下文，替代了原有的外部状态管理。

## 组件结构

### 1. 核心机器人实例

**位置**: `src/bot.js`

**功能**:
- 初始化 `grammy` Bot 实例。
- 统一配置全局中间件（如日志记录、会话管理）。
- 注册所有命令处理模块。
- 定义全局错误处理逻辑。

### 2. 命令处理器 (Commands)

**位置**: `commands/`

**功能**:
- 每个文件实现一个独立的命令逻辑。
- 导出一个符合 `grammy` 中间件规范的函数（接受 `ctx` 对象）。
- 通过 `bot.use(commandModule)` 在 `src/bot.js` 中按需装载。

**示例**:
```javascript
// commands/hello.js
module.exports = async (ctx, next) => {
  if (ctx.message?.text === '/hello') {
    await ctx.reply('Hello!');
  } else {
    await next();
  }
};
```

## 文件结构

```
api/                # Vercel Serverless Function 入口
commands/           # 命令处理模块
src/
└── bot.js          # 核心 bot 配置与装载
utils/
├── logger.js       # 日志工具
└── state.js        # 其他辅助工具
```

## 架构优势

1. **高性能**: 基于 `grammy` 的轻量级设计，极大地提升了处理效率。
2. **高可维护性**: 架构扁平，代码逻辑清晰，移除旧架构中的循环依赖风险。
3. **高扩展性**: 基于 middleware 模式，可轻松添加拦截器、认证插件等。
4. **强类型支持**: 配合 TypeScript 能够获得更好的开发体验（当前项目为 JS）。

## 开发与集成流程

1. **添加新功能**: 在 `commands/` 下创建新的模块。
2. **注册功能**: 在 `src/bot.js` 中通过 `bot.use()` 引入新模块。
3. **部署**: 项目部署至 Vercel，通过 `api/` 下的 Serverless Functions 作为 webhook 入口。
