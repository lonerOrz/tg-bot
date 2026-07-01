const { Composer } = require("grammy");

const cmd = new Composer();

cmd.command("dice", async (ctx) => {
  await ctx.replyWithDice();
});

module.exports = cmd;
