# Telegram bot

A test telegram bot which is deployed to Vercel. See my blog post on it:

[https://marclittlemore.com/serverless-telegram-chatbot-vercel](https://marclittlemore.com/serverless-telegram-chatbot-vercel/)

## Installing

Clone this repository into a new directory and install the dependencies:

```bash
git clone git@github.com:MarcL/telegram-test-bot.git
cd telegram-test-bot
npm install
```

## Deploying to Vercel

Install the Vercel command line tools using `npm`:

```bash
npm install -g vercel
```

Deploy the project to your Vercel account:

```bash
vercel
```

## GitHub仓库监控功能

本机器人支持监控GitHub仓库的Star、Fork、Issue、Pull Request和Release变化。通过GitHub Webhooks实现实时通知。

### 配置Webhook

1. 部署机器人后，获取Webhook URL：`https://<your-deployment-url>/api/github-webhook`
2. 在需要监控的GitHub仓库中，进入Settings > Webhooks > Add webhook
3. 设置Payload URL为上述URL
4. 选择Content type为`application/json`
5. 选择触发事件：`Stars`、`Forks`、`Issues`、`Pull requests`、`Releases`等
6. 如果设置了`GITHUB_WEBHOOK_SECRET`环境变量，请在GitHub中也设置相同的Secret

### 环境变量配置

- `TELEGRAM_TOKEN`: 机器人的Telegram API token
- `NOTIFICATION_USER_ID`: 接收通知的用户ID（可通过向机器人发送消息并查看webhook日志获取）
- `ALLOWED_GITHUB_REPOS`: 要监控的仓库列表，逗号分隔（例如：`user/repo1,user/repo2`），如果为空则监控所有仓库
- `GITHUB_WEBHOOK_SECRET`: 可选，用于验证webhook请求的密钥

### 功能说明

当配置的GitHub仓库发生以下事件时，机器人会向指定用户发送通知：
- Star（包括新增和取消Star）
- Fork
- Issue（创建、关闭、重新打开等）
- Pull Request（创建、合并、关闭等）
- Release（发布、更新、删除等）
- Watch（关注/取消关注）

## GitHub Bot Webhook功能

本机器人支持通过GitHub issue_comment事件触发特定操作，例如触发GitHub Actions工作流。

### 配置Webhook

1. 部署机器人后，获取Webhook URL：`https://<your-deployment-url>/api/loner-bot-webhook`
2. 在需要监控的GitHub仓库中，进入Settings > Webhooks > Add webhook
3. 设置Payload URL为上述URL
4. 选择Content type为`application/json`
5. 选择触发事件：`Issue comments`
6. 如果设置了`GITHUB_BOT_WEBHOOK_SECRET`环境变量，请在GitHub中也设置相同的Secret

### 环境变量配置

- `GH_TOKEN` 或 `GITHUB_TOKEN`: GitHub个人访问令牌，用于触发工作流
- `GITHUB_ALLOWED_USER_IDS`: 允许触发构建的GitHub用户ID列表，逗号分隔（例如：`123456,789012`）
- `GITHUB_BOT_WEBHOOK_SECRET`: 可选，用于验证webhook请求的密钥

### 功能说明

当在PR中评论包含`@loneros-bot build <package-name>`时，机器人会：
1. 验证评论者是否在允许的用户列表中
2. 提取包名和PR信息
3. 触发lonerOrz/nixpkgs-review-gha仓库中名为`build-pr.yml`的GitHub Actions工作流
4. 记录操作到日志中

支持的命令格式：
- `@loneros-bot build <package-name>` - 使用默认参数构建包
- `@loneros-bot build <package-name> -h 1100` - 使用数字代码指定构建平台 (1100表示构建Linux平台，不构建Darwin平台)
- `@loneros-bot build <package-name> -u` - 启用upterm
- `@loneros-bot build <package-name> -p` - 禁用发布结果

支持的参数：
- `-h <code>` - 使用4位数字代码指定构建平台 (1=启用, 0=禁用): 第1位=x86_64-linux, 第2位=aarch64-linux, 第3位=x86_64-darwin, 第4位=aarch64-darwin
- `-u` - 启用upterm (默认: 禁用)
- `-p` - 禁用发布结果 (默认: 启用)
- `+u` - 禁用upterm (默认: 禁用)
- `+p` - 启用发布结果 (默认: 启用)

例如：
- `@loneros-bot build hello` - 使用默认参数构建hello包 (构建所有平台)
- `@loneros-bot build hello -h 1100` - 只构建Linux平台 (x86_64-linux和aarch64-linux)
- `@loneros-bot build hello -h 1010` - 构建x86_64-linux和x86_64-darwin
- `@loneros-bot build hello -u` - 构建hello包并启用upterm
