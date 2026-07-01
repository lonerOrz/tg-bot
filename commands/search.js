const { Composer } = require("grammy");
const { logger } = require("../utils/logger");

const cmd = new Composer();

cmd.command("search", async (ctx) => {
  const query = ctx.match?.trim();

  if (!query) {
    return ctx.reply(
      "Usage: `/search <package_name>`\nExample: `/search ripgrep`",
      {
        parse_mode: "Markdown",
      },
    );
  }

  try {
    const credentials = Buffer.from(
      "aWVSALXpZv:X8gPHnzL52wFEekuxsfQ9cSh",
    ).toString("base64");

    // Querying the NixOS Elasticsearch backend directly
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
            multi_match: {
              query: query,
              fields: ["package_pname", "package_description"],
            },
          },
          size: 5, // Retrieve the top 5 most relevant results
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Nix Search API error: ${response.status}`);
    }

    const data = await response.json();
    const hits = data.hits?.hits || [];

    if (hits.length === 0) {
      return ctx.reply(`❌ No packages found matching \`${query}\`.`, {
        parse_mode: "Markdown",
      });
    }

    let replyText = `🔍 *Search results for:* \`${query}\`\n\n`;

    hits.forEach((hit, index) => {
      const source = hit._source;
      const name = source.package_pname || "Unknown";
      const version = source.package_version || "N/A";
      const desc = source.package_description || "No description provided.";
      const homepage = source.package_homepage?.[0] || "";

      if (homepage) {
        replyText += `${index + 1}. *[${name}](${homepage})* (v${version})\n_${desc}_\n\n`;
      } else {
        replyText += `${index + 1}. *${name}* (v${version})\n_${desc}_\n\n`;
      }
    });

    await ctx.reply(replyText, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Error searching Nix package:", error);
    await ctx.reply(
      "⚠️ Failed to search for Nix packages. Please try again later.",
    );
  }
});

module.exports = {
  composer: cmd,
  command: "search",
  description: "Search for packages in Nixpkgs",
};
