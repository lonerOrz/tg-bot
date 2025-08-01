const permissionsCheck = require("./permissions");
const handleHello = require("./hello");

const commands = {
  "/checkbot": permissionsCheck,
  "/hello": handleHello,
};

module.exports = async (bot, msg) => {
  const text = msg.text.trim();
  const cmd = text.split(" ")[0];

  const handler = commands[cmd];
  if (handler) {
    await handler(bot, msg);
    return true; // 命令已处理
  }
  return false; // 没有匹配命令
};
