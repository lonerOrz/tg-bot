const { Composer } = require("grammy");
const { logger } = require("../utils/logger");

const cmd = new Composer();

/**
 * Escapes HTML special characters to prevent Telegram formatting crashes
 */
function escapeHTML(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

cmd.command("search", async (ctx) => {
  const query = ctx.match?.trim();

  if (!query) {
    return ctx.reply(
      "Usage: <code>/search &lt;package_name&gt;</code>\nExample: <code>/search ripgrep</code>",
      {
        parse_mode: "HTML",
      },
    );
  }

  try {
    const credentials = Buffer.from(
      "aWVSALXpZv:X8gPHnzL52wFEekuxsfQ9cSh",
    ).toString("base64");
    const response = await fetch(
      "https://search.nixos.org/backend/latest-*-nixos-unstable/_search",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            multi_match: {
              query: query,
              fields: ["package_pname", "package_description"],
            },
          },
          size: 5,
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      logger.error(`Nix Search API error: ${response.status}`, {
        response: errBody,
      });
      throw new Error(`Nix Search API error: ${response.status}`);
    }

    const data = await response.json();
    const hits = data.hits?.hits || [];

    if (hits.length === 0) {
      return ctx.reply(
        `No packages found matching <code>${escapeHTML(query)}</code>.`,
        {
          parse_mode: "HTML",
        },
      );
    }

    let replyText = `<b>N I X P K G S   S E A R C H</b>\n`;
    replyText += `───────────────────────────\n\n`;

    hits.forEach((hit, index) => {
      const source = hit._source;
      const name = escapeHTML(source.package_pname || "Unknown");
      const version = escapeHTML(source.package_pversion || "N/A");
      const desc = escapeHTML(
        source.package_description || "No description provided.",
      );
      const homepage = source.package_homepage?.[0] || "";

      replyText += `[${index + 1}] <b>${name}</b>  •  v${version}\n`;
      replyText += `<i>${desc}</i>\n`;
      if (homepage) {
        replyText += `↳ <a href="${homepage}">Project Homepage</a>\n`;
      }
      replyText += `\n`;
    });

    await ctx.reply(replyText, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Error searching Nix package:", error);
    await ctx.reply("System error. Failed to perform Nix package search.");
  }
});

module.exports = {
  composer: cmd,
  command: "search",
  description: "Search for packages in Nixpkgs",
};
