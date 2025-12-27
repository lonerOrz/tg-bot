# 自动命令注册功能

本项目实现了自动命令注册功能，可以向 Telegram 注册机器人的命令列表，提供用户输入`/`时的自动补全功能。

## 功能说明

- 自动扫描 [commands](file:///home/loner/Templates/tg-bot/commands) 目录中的所有命令文件
- 从每个命令文件中提取命令名称和描述信息
- 自动调用 `setMyCommands` 注册这些命令到 Telegram
- 当用户在聊天中输入 `/` 时，Telegram 会显示机器人的命令列表供用户选择

## 使用方法

### 1. 注册命令

运行以下命令来注册机器人命令：

```bash
npm run register-commands
```

或者直接运行：

```bash
node register-commands.js
```

### 2. 添加新命令

当您添加新命令时，请确保在命令文件中包含 `commandMetadata`：

```javascript
// 命令处理函数
module.exports = async (bot, msg) => {
  // 命令逻辑
};

// 命令元数据
module.exports.commandMetadata = {
  command: 'commandname',      // 命令名称（不含斜杠）
  description: '命令描述'      // 命令的描述
};
```

### 3. 命令元数据示例

以下是在 [commands](file:///home/loner/Templates/tg-bot/commands) 目录中已定义的命令：

- `/hello` - 发送问候语
- `/dice` - 掷骰子游戏
- `/checkbot` - 检查机器人在群组中的权限
- `/testverify` - 测试验证逻辑

## 实现原理

1. `commands/registerCommands.js` - 扫描命令目录并自动注册
2. 每个命令文件导出 `commandMetadata` 对象，包含命令名称和描述
3. `register-commands.js` - 独立的命令行脚本，用于注册命令
4. 在 [package.json](file:///home/loner/Templates/tg-bot/package.json) 中添加 `register-commands` 脚本

## 注意事项

- 只有导出 `commandMetadata` 的命令文件才会被注册
- 以下文件不会被注册：`commands.js`、`commandHandler.js`、`registerCommands.js`
- 命令名称应使用小写字母，不能包含 `/`
- 命令描述应简洁明了，不超过 200 字符

## 最佳实践

1. 为所有用户可调用的命令添加元数据
2. 定期运行命令注册脚本以确保命令列表是最新的
3. 在部署新命令后记得重新注册