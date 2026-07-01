const { Bot, session } = require("grammy");
const config = require("../config");
const { logger } = require("../utils/logger");
const commands = require("../commands");

const bot = new Bot(config.telegramToken);

bot.use(session({ initial: () => ({}) }));

bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`Update ${ctx.update.update_id} handled in ${ms}ms`);
});

// Load all command composers automatically
for (const cmd of commands) {
  if (cmd.composer) {
    bot.use(cmd.composer);
  }
}

bot.catch((err) => {
  logger.error("Bot error:", err);
  err.ctx.reply("An error occurred. Please try again later.");
});

module.exports = bot;
