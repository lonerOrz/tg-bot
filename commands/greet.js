const { Composer } = require("grammy");

const cmd = new Composer();

cmd.command("greet", async (ctx) => {
  const firstName = ctx.from?.first_name || "Guest";
  const replyMessage = `👋 Hello, ${firstName}! \n\nWelcome to our group. I am a helper bot. Let me know if you need any assistance!`;

  await ctx.reply(replyMessage);
});

module.exports = {
  composer: cmd,
  command: "greet",
  description: "Greet the user"
};
