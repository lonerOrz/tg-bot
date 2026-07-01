const bot = require("./src/bot");

async function main() {
  console.log("Starting bot in polling mode...");
  bot.start({
    onStart: (info) => {
      console.log(`Bot @${info.username} is running!`);
    },
  });
}

main().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
