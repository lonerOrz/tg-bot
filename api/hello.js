module.exports = async (bot, msg) => {
  const {
    chat: {
      id
    },
    text
  } = msg;

  const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;

  await bot.sendMessage(id, message, { parse_mode: "Markdown" });
};
