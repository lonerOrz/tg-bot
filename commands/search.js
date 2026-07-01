const { Composer } = require("grammy");

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
              // Prioritize package name and attribute path over description match
              fields: [
                "package_pname^5",
                "package_attr_name^3",
                "package_description",
              ],
              type: "best_fields",
            },
          },
          size: 15,
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Nix Search API error: ${response.status}`, errBody);
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

    // Filter out duplicate package_attr_name outputs to keep results distinct and clear
    const uniqueHits = [];
    const seenAttrs = new Set();
    for (const hit of hits) {
      const source = hit._source;
      if (!source) continue;
      const attrName = source.package_attr_name;
      if (attrName && !seenAttrs.has(attrName)) {
        seenAttrs.add(attrName);
        uniqueHits.push(hit);
      }
    }

    // Render top 5 unique results
    const displayedHits = uniqueHits.slice(0, 5);

    let replyText = `<b>N I X P K G S   S E A R C H</b>\n`;
    replyText += `───────────────────────────\n\n`;

    displayedHits.forEach((hit) => {
      const source = hit._source;

      const name = escapeHTML(source.package_pname || "Unknown");
      const version = escapeHTML(source.package_pversion || "N/A");
      const attrName = escapeHTML(source.package_attr_name || name);
      const desc = escapeHTML(
        source.package_description || "No description provided.",
      );
      const homepage = source.package_homepage?.[0] || "";
      const position = source.package_position || "";

      // Map licenses to a clean string
      const licenseList = source.package_license || [];
      const licenseStr = escapeHTML(
        licenseList
          .map((l) => l.fullName || l.spdxId)
          .filter(Boolean)
          .join(", ") || "Unknown License",
      );

      // Generate a direct link to the exact Nix expression line on GitHub nixpkgs repository
      let positionLinkHtml = "";
      if (position) {
        // Transforms 'pkgs/by-name/.../package.nix:66' to 'pkgs/by-name/.../package.nix#L66'
        const cleanPosition = position.replace(":", "#L");
        const positionUrl = `https://github.com/NixOS/nixpkgs/blob/master/${cleanPosition}`;
        positionLinkHtml = `  •  <a href="${positionUrl}">Nix Source</a>`;
      }

      // 1st line: Title (hyperlinked to homepage) & Version
      if (homepage) {
        replyText += `• <b><a href="${homepage}">${name}</a></b>  •  <code>v${version}</code>\n`;
      } else {
        replyText += `• <b>${name}</b>  •  <code>v${version}</code>\n`;
      }

      // 2nd line: Attribute Path & License & GitHub Nix Source Link
      replyText += `  <code>nixpkgs#${attrName}</code>  •  <i>${licenseStr}</i>${positionLinkHtml}\n`;

      // 3rd line: Description
      replyText += `  <i>${desc}</i>\n\n`;
    });

    await ctx.reply(replyText, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error searching Nix package:", error);
    await ctx.reply("System error. Failed to perform Nix package search.");
  }
});

module.exports = {
  composer: cmd,
  command: "search",
  description: "Search for packages in Nixpkgs",
};
