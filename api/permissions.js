module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;

  // 检查是否在群组中
  if (!msg.chat.type.includes("group")) {
    // 创建一个带有 chatId 的错误，以便上层可以捕获并发送消息
    const error = new Error("⚠️ 此命令只能在群组中使用。");
    error.chatId = chatId;
    throw error;
  }

  // 检查机器人是否是管理员
  const me = await bot.getMe();
  const admins = await bot.getChatAdministrators(chatId);
  const botAdmin = admins.find((admin) => admin.user.id === me.id);

  if (!botAdmin) {
    const error = new Error("❌ 我不是管理员，请先将我设为群管理员！");
    error.chatId = chatId;
    throw error;
  }

  // 构建并发送权限报告
  const perms = {
    "踢人权限 (can_restrict_members)": botAdmin.can_restrict_members,
    "删除消息 (can_delete_messages)": botAdmin.can_delete_messages,
    "置顶消息 (can_pin_messages)": botAdmin.can_pin_messages,
    "邀请用户 (can_invite_users)": botAdmin.can_invite_users,
    "更改群信息 (can_change_info)": botAdmin.can_change_info,
    "提升管理员 (can_promote_members)": botAdmin.can_promote_members,
    "管理视频聊天 (can_manage_video_chats)": botAdmin.can_manage_video_chats,
    "管理话题 (can_manage_topics)": botAdmin.can_manage_topics,
  };

  let text = `🤖 *权限检查报告*\n\n`;
  for (const [key, value] of Object.entries(perms)) {
    text += `${value ? "✅" : "❌"} ${key}\n`;
  }

  // 直接发送成功消息
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
};
