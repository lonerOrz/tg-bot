/**
 * 权限检查服务模块
 * 处理权限检查逻辑
 */

const config = require("../config");
const { createErrorWithChatId } = require("./errorHandler");

/**
 * 检查机器人是否在群组中
 * @param {Object} msg - 消息对象
 * @throws {Error} 如果不在群组中则抛出错误
 */
const checkIfInGroup = (msg) => {
  if (!msg.chat.type.includes("group")) {
    throw createErrorWithChatId("⚠️ 此命令只能在群组中使用。", msg.chat.id);
  }
};

/**
 * 检查是否在允许的群组中
 * @param {Object} msg - 消息对象
 * @throws {Error} 如果群组不在白名单中则抛出错误
 */
const checkGroupWhitelist = (msg) => {
  const chatId = msg.chat.id;

  if (config.enableGroupWhitelist && msg.chat.type.includes("group") && !config.allowedGroups.includes(chatId)) {
    throw createErrorWithChatId("❌ 此群组未被授权使用机器人。", chatId);
  }
};

/**
 * 检查是否在允许的群组中（用于命令处理器）
 * @param {Object} msg - 消息对象
 * @returns {boolean} - 是否通过检查
 */
const checkGroupWhitelistForCommand = (msg) => {
  const chatId = msg.chat.id;

  if (config.enableGroupWhitelist && msg.chat.type.includes("group") && !config.allowedGroups.includes(chatId)) {
    const error = createErrorWithChatId("❌ 此群组未被授权使用机器人。", chatId);
    throw error;
  }
  return true;
};

/**
 * 检查机器人是否为管理员
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} msg - 消息对象
 * @throws {Error} 如果机器人不是管理员则抛出错误
 */
const checkBotAdmin = async (bot, msg) => {
  const chatId = msg.chat.id;

  // 检查机器人是否是管理员
  const me = await bot.getMe();
  const admins = await bot.getChatAdministrators(chatId);
  const botAdmin = admins.find((admin) => admin.user.id === me.id);

  if (!botAdmin) {
    throw createErrorWithChatId("❌ 我不是管理员，请先将我设为群管理员！", chatId);
  }

  return botAdmin;
};

/**
 * 构建权限报告文本
 * @param {Object} botAdmin - 机器人的管理员权限对象
 * @returns {string} 权限报告文本
 */
const buildPermissionsReport = (botAdmin) => {
  const perms = {
    "管理聊天 (can_manage_chat)": botAdmin.can_manage_chat,
    "删除消息 (can_delete_messages)": botAdmin.can_delete_messages,
    "踢人权限 (can_restrict_members)": botAdmin.can_restrict_members,
    "邀请用户 (can_invite_users)": botAdmin.can_invite_users,
    "固定消息 (can_pin_messages)": botAdmin.can_pin_messages,
    "提升管理员 (can_promote_members)": botAdmin.can_promote_members,
    "更改群信息 (can_change_info)": botAdmin.can_change_info,
    "管理视频聊天 (can_manage_video_chats)": botAdmin.can_manage_video_chats,
    "管理话题 (can_manage_topics)": botAdmin.can_manage_topics,
    "发布快拍 (can_post_stories)": botAdmin.can_post_stories,
    "编辑快拍 (can_edit_stories)": botAdmin.can_edit_stories,
    "删除快拍 (can_delete_stories)": botAdmin.can_delete_stories,
    "可被编辑 (can_be_edited)": botAdmin.can_be_edited,
    "匿名管理员 (is_anonymous)": botAdmin.is_anonymous,
  };

  let text = `🤖 *权限检查报告*\n\n`;
  for (const [key, value] of Object.entries(perms)) {
    text += `${value ? "✅" : "❌"} ${key}\n`;
  }

  return text;
};

module.exports = {
  checkIfInGroup,
  checkGroupWhitelist,
  checkGroupWhitelistForCommand,
  checkBotAdmin,
  buildPermissionsReport,
};