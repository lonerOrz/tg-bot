module.exports = async (bot, body) => {
  const {
    chat: { id },
    text,
  } = body.message;

  const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;

  await bot.sendMessage(id, message, { parse_mode: "Markdown" });
};
