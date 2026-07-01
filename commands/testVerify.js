const { Composer, InlineKeyboard } = require("grammy");
const config = require("../config");
const { logger } = require("../utils/logger");
const state = require("../utils/state");

const VERIFICATION_TIMEOUT = config.verificationTimeout || 300000;
const quizQuestions = [
  {
    question: "Welcome! Please answer this to verify you're human: What has keys but no locks?",
    options: ["A piano", "A car", "A door", "A keyboard"],
    correctIndex: 3,
  },
  {
    question: "Welcome! Please answer this to verify you're human: What has a face and two hands but no arms or legs?",
    options: ["A doll", "A clock", "A mirror", "A photo"],
    correctIndex: 1,
  },
  {
    question: "Welcome! Please answer this to verify you're human: What gets wetter the more it dries?",
    options: ["A sponge", "A towel", "Soap", "Paper"],
    correctIndex: 1,
  },
];

const cmd = new Composer();

cmd.command("testverify", async (ctx) => {
  if (!config.adminUsers.includes(ctx.from.id)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  if (ctx.chat.type === "private") {
    return ctx.reply("❌ Test verification can only be executed within a group or supergroup.");
  }

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const question =
    quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
  const keyboard = new InlineKeyboard();
  question.options.forEach((opt, i) => {
    keyboard.text(opt, `verify_${userId}_${i}`);
  });

  const sentMessage = await ctx.api.sendMessage(
    chatId,
    question.question,
    { reply_markup: keyboard }
  );

  await state.setPendingVerification(chatId, userId, {
    correctIndex: question.correctIndex,
    messageId: sentMessage.message_id,
    timestamp: Date.now(),
  }, Math.floor(VERIFICATION_TIMEOUT / 1000));

  await ctx.reply("Test verification started.");
});

module.exports = cmd;
