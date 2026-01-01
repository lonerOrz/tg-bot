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
