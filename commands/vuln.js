const { Composer } = require("grammy");
const { logger } = require("../utils/logger");

const cmd = new Composer();

/**
 * Helper function to query OSV database
 */
async function checkPackageVulnerabilities(packageName, version) {
  const response = await fetch("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: version,
      package: {
        name: packageName,
        ecosystem: "Nixpkgs",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OSV API error: ${response.status}`);
  }

  const data = await response.json();
  return data.vulns || [];
}

/**
 * Helper function to fetch the latest package version from Nixpkgs unstable
 */
async function getLatestNixVersion(packageName) {
  const credentials = Buffer.from(
    "aWVSALXpZv:X8gPHnzL52wFEekuxsfQ9cSh",
  ).toString("base64");
  const response = await fetch(
    "https://search.nixos.org/backend/latest-44-nixos-unstable/_search",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          term: {
            package_pname: packageName,
          },
        },
        size: 1,
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const hits = data.hits?.hits || [];
  if (hits.length > 0) {
    return hits[0]._source.package_version || null;
  }
  return null;
}

cmd.command("vuln", async (ctx) => {
  const input = ctx.match?.trim() || "";
  const parts = input.split(/\s+/);

  const packageName = parts[0];
  let version = parts[1];

  if (!packageName) {
    return ctx.reply(
      "Usage: `/vuln <package_name> [version]`\nExample: `/vuln openssl 3.0.7` or `/vuln openssl`",
      {
        parse_mode: "Markdown",
      },
    );
  }

  try {
    let resolvingMsg = null;

    // If version is omitted, fetch the latest version automatically
    if (!version) {
      resolvingMsg = await ctx.reply(
        `🔍 Fetching the latest version for \`${packageName}\` in Nixpkgs unstable...`,
        {
          parse_mode: "Markdown",
        },
      );
      version = await getLatestNixVersion(packageName);

      if (!version) {
        if (resolvingMsg) {
          await ctx.api
            .deleteMessage(ctx.chat.id, resolvingMsg.message_id)
            .catch(() => {});
        }
        return ctx.reply(
          `❌ Could not resolve the latest version for \`${packageName}\` on Nixpkgs. Please specify a version manually.`,
          {
            parse_mode: "Markdown",
          },
        );
      }
    }

    const scanningMsg = resolvingMsg
      ? await ctx.api.editMessageText(
          ctx.chat.id,
          resolvingMsg.message_id,
          `🛡️ Scanning \`${packageName}\` v${version} for vulnerabilities...`,
          { parse_mode: "Markdown" },
        )
      : await ctx.reply(
          `🛡️ Scanning \`${packageName}\` v${version} for vulnerabilities...`,
          { parse_mode: "Markdown" },
        );

    // Perform scan using OSV database
    const vulns = await checkPackageVulnerabilities(packageName, version);

    if (scanningMsg) {
      await ctx.api
        .deleteMessage(ctx.chat.id, scanningMsg.message_id)
        .catch(() => {});
    }

    if (vulns.length === 0) {
      return ctx.reply(
        `✅ *${packageName}* (v${version}) has *0* known vulnerabilities in the OSV database under the Nixpkgs ecosystem.`,
        {
          parse_mode: "Markdown",
        },
      );
    }

    let replyText = `⚠️ *Vulnerabilities detected for* \`${packageName}\` (v${version}):\n\n`;

    // Display up to 5 vulnerabilities to prevent hitting Telegram message length limits
    const displayedVulns = vulns.slice(0, 5);
    displayedVulns.forEach((vuln) => {
      const id = vuln.id || "N/A";
      const summary = vuln.summary || "No summary provided.";
      const link = `https://osv.dev/vulnerability/${id}`;
      replyText += `• *[${id}](${link})*\n_${summary}_\n\n`;
    });

    if (vulns.length > 5) {
      replyText += `*...and ${vulns.length - 5} more vulnerabilities.*`;
    }

    await ctx.reply(replyText, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Error scanning vulnerabilities:", error);
    await ctx.reply(
      "⚠️ Failed to perform vulnerability scan. Please try again later.",
    );
  }
});

module.exports = {
  composer: cmd,
  command: "vuln",
  description: "Scan a Nix package for CVE vulnerabilities",
};
