const permissionsCheck = require("./permissions");
const handleHello = require("./hello");

const commands = {
  "/checkbot": permissionsCheck,
  "/hello": handleHello,
};

module.exports = async (bot, msg) => {
  const text = msg.text.trim();
  const cmd = text.split(" ")[0].split("@")[0];

  const handler = commands[cmd];
  if (handler) {
    // 这里不再需要 try/catch，因为错误会由 webhook.js 统一处理
    await handler(bot, msg);
  }
  // 如果没有匹配的命令，则不执行任何操作
};