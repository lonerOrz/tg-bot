const { Composer, InlineKeyboard } = require("grammy");
const config = require("../config");
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

cmd.on("chat_member", async (ctx) => {
  const newMember = ctx.update.chat_member.new_chat_member;
  const status = newMember.status;
  if (status !== "member") return;

  const chatId = ctx.chat.id;
  const userId = newMember.user.id;
  const chatMember = await ctx.api.getChatMember(chatId, ctx.from.id);
  if (["administrator", "creator"].includes(chatMember.status)) return;

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
});

cmd.callbackQuery(/^verify_(\d+)_(\d+)$/, async (ctx) => {
  const targetUserId = parseInt(ctx.match[1]);
  const selectedIndex = parseInt(ctx.match[2]);
  const chatId = ctx.chat.id;
  const callbackUserId = ctx.from.id;

  if (callbackUserId !== targetUserId) {
    await ctx.answerCallbackQuery({
      text: "This verification is not for you!",
      show_alert: true,
    });
    return;
  }

  const pendingData = await state.getPendingVerification(chatId, targetUserId);

  if (!pendingData) {
    await ctx.answerCallbackQuery({
      text: "Verification expired or already completed.",
      show_alert: true,
    });
    return;
  }

  await state.removePendingVerification(chatId, targetUserId);

  if (selectedIndex === pendingData.correctIndex) {
    await ctx.answerCallbackQuery({ text: "Correct! You are verified." });
    await ctx.api.sendMessage(
      chatId,
      `${ctx.from.first_name || "User"} has been verified!`
    );
    await ctx.deleteMessage().catch(() => {});
  } else {
    await ctx.answerCallbackQuery({
      text: "Incorrect. You will be removed.",
      show_alert: true,
    });
    await ctx.api.sendMessage(
      chatId,
      `${ctx.from.first_name || "User"} failed verification and was removed.`
    );
    
    if (ctx.chat.type !== "private") {
      await ctx.api.banChatMember(chatId, targetUserId);
      await ctx.api.unbanChatMember(chatId, targetUserId);
    } else {
      await ctx.api.sendMessage(chatId, "⚠️ Note: Banning is not supported in private chats.");
    }
    
    await ctx.deleteMessage().catch(() => {});
  }
});

module.exports = cmd;
