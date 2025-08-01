module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type.includes("group");

  if (!isGroup) {
    return bot.sendMessage(chatId, "⚠️ 此命令只能在群组中使用");
  }

  try {
    const me = await bot.getMe();
    const admins = await bot.getChatAdministrators(chatId);
    const botAdmin = admins.find((admin) => admin.user.id === me.id);

    if (!botAdmin) {
      return bot.sendMessage(chatId, "❌ 我不是管理员，请先将我设为群管理员！");
    }

    const perms = {
      "踢人权限 (can_restrict_members)": botAdmin.can_restrict_members,
      "删除消息权限 (can_delete_messages)": botAdmin.can_delete_messages,
      "限制成员 (can_restrict_members)": botAdmin.can_restrict_members,
      "固定消息 (can_pin_messages)": botAdmin.can_pin_messages,
      "邀请用户 (can_invite_users)": botAdmin.can_invite_users,
    };

    let text = `🤖 *权限检查报告*\n\n`;
    for (const [key, value] of Object.entries(perms)) {
      text += `${value ? "✅" : "❌"} ${key}\n`;
    }

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("权限检查失败：", err);
    await bot.sendMessage(
      chatId,
      "❗️ 无法获取权限信息，可能是 Telegram 出错或我没有足够权限。",
    );
  }
};
