module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;

  try {
    // 首先检查是否在群组中
    if (!msg.chat.type.includes("group")) {
      await bot.sendMessage(chatId, "⚠️ 此命令只能在群组中使用。");
      return;
    }

    // 然后检查机器人是否是管理员
    const me = await bot.getMe();
    const admins = await bot.getChatAdministrators(chatId);
    const botAdmin = admins.find((admin) => admin.user.id === me.id);

    if (!botAdmin) {
      await bot.sendMessage(chatId, "❌ 我不是管理员，请先将我设为群管理员！");
      return;
    }

    // 最后，构建并发送权限报告
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
    // 统一的错误提示
    await bot.sendMessage(
      chatId,
      "❗️ 执行命令时出错，请稍后重试或联系管理员."
    ).catch(console.error); // 如果连错误消息都发不出去，就在后台记录
  }
};