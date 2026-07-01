const { webhookCallback } = require("grammy");
const bot = require("../src/bot");

const handler = webhookCallback(bot, "express");

module.exports = handler;
