const { webhookCallback } = require("grammy");
const bot = require("../src/bot");

const handler = webhookCallback(bot, "https");

module.exports = handler;
