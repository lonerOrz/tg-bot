const { Bot } = require("grammy");
const config = require("./config");
const commands = require("./commands");

if (!config.telegramToken) {
  console.warn("Warning: TELEGRAM_TOKEN is missing. Skipping command registration.");
  process.exit(0);
}

const bot = new Bot(config.telegramToken);

async function register() {
  console.log("Registering commands with Telegram...");
  try {
    // Filter modules that have both command and description metadata defined
    const commandList = commands
      .filter(cmd => cmd.command && cmd.description)
      .map(cmd => ({
        command: cmd.command,
        description: cmd.description
      }));

    if (commandList.length > 0) {
      await bot.api.setMyCommands(commandList);
      console.log("Commands successfully registered.");
    } else {
      console.log("No commands with metadata found.");
    }
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

register();
