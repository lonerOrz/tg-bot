const { Composer } = require("grammy");
const config = require("../config");

const cmd = new Composer();

cmd.command("permissions", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const isAdmin = config.adminUsers.includes(userId);
  const isWhitelisted = config.allowedGroups.includes(chatId);

  let response = `Your permissions:\n\n`;
  response += `Admin: ${isAdmin ? "Yes" : "No"}\n`;
  response += `Whitelisted group: ${isWhitelisted ? "Yes" : "No"}\n`;

  await ctx.reply(response);
});

module.exports = {
  composer: cmd,
  command: "permissions",
  description: "Check bot permissions"
};
