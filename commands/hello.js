const { Composer } = require("grammy");

const cmd = new Composer();

cmd.command("hello", async (ctx) => {
  await ctx.reply("Hey there! I'm your Telegram bot. How can I help you today?");
});

module.exports = {
  composer: cmd,
  command: "hello",
  description: "Say hello to the bot"
};
