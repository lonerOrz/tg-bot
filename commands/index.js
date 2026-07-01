const fs = require("fs");
const path = require("path");

const commands = [];
const files = fs.readdirSync(__dirname);

for (const file of files) {
  if (file === "index.js" || !file.endsWith(".js")) continue;
  const cmd = require(path.join(__dirname, file));
  commands.push(typeof cmd.composer === "undefined" ? { composer: cmd } : cmd);
}

module.exports = commands;
