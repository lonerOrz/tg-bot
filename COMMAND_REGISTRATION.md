# 命令配置说明

本项目采用 `grammy` 框架的 Middleware 模式管理命令。命令不再需要复杂的自动扫描注册，而是直接在核心模块中声明与装载。

## 配置方式

所有命令模块位于 `commands/` 目录下。要使一个命令生效，需要完成以下两步：

### 1. 编写命令模块
每个命令模块应导出一个中间件函数，处理请求并根据 `ctx.message.text` 执行相应的逻辑：

```javascript
// commands/hello.js
module.exports = async (ctx, next) => {
  if (ctx.message?.text === '/hello') {
    await ctx.reply('Hello!');
  } else {
    // 如果不是该命令，继续执行后续中间件
    await next();
  }
};
```

### 2. 装载命令
在 `src/bot.js` 中引入并使用 `bot.use()` 来注册命令：

```javascript
// src/bot.js
const hello = require("../commands/hello");
// ...

const bot = new Bot(config.telegramToken);
bot.use(hello);
// ...
```

## 注意事项
- **执行顺序**: `bot.use()` 的顺序决定了中间件的执行顺序。如果某个命令模块未处理请求（即进入了 `else { await next(); }`），请求会传递给后续的中间件。
- **无需手动注册**: 通过 `grammy` 框架，只要正确装载中间件，用户即可在 Telegram 中直接使用命令。
- **命令文档**: 为便于用户查询，建议在 `README.md` 中维护一个简单的可用命令列表。
