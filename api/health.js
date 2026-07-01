const config = require("../config");

module.exports = async (request, response) => {
  try {
    const hasToken = !!config.telegramToken;
    const hasGroups = config.allowedGroups.length > 0;
    const hasAdmins = config.adminUsers.length > 0;

    response.status(200).json({
      status: hasToken ? "ok" : "degraded",
      checks: {
        config: hasToken,
        groups: hasGroups,
        admins: hasAdmins,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    response.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
