const fs = require("fs");
const path = require("path");

const commands = [];
const files = fs.readdirSync(__dirname);

for (const file of files) {
  // Skip index.js and non-js files
  if (file === "index.js" || !file.endsWith(".js")) {
    continue;
  }

  const moduleExport = require(path.join(__dirname, file));

  // Normalize exports: if a file directly exports a Composer, wrap it.
  const normalized = typeof moduleExport.composer === "undefined"
    ? { composer: moduleExport }
    : moduleExport;

  commands.push(normalized);
}

module.exports = commands;
