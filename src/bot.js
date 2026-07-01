const { Bot, session } = require("grammy");
const config = require("../config");
const { logger } = require("../utils/logger");
const hello = require("../commands/hello");
const greet = require("../commands/greet");
const dice = require("../commands/dice");
const verify = require("../commands/verify");
const testVerify = require("../commands/testVerify");
const permissions = require("../commands/permissions");

const bot = new Bot(config.telegramToken);

bot.use(session({ initial: () => ({}) }));

bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`Update ${ctx.update.update_id} handled in ${ms}ms`);
});

bot.use(hello);
bot.use(greet);
bot.use(dice);
bot.use(verify);
bot.use(testVerify);
bot.use(permissions);

bot.catch((err) => {
  logger.error("Bot error:", err);
  err.ctx.reply("An error occurred. Please try again later.");
});

module.exports = bot;
