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

/**
 * Parses GitHub URL to extract owner and repo for PURL generation
 */
function parseGithubUrl(url) {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    const owner = match[1];
    let repo = match[2];
    if (repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }
    return { owner, repo };
  }
  return null;
}

/**
 * Query OSV database using standard PURL (Package URL) spec
 */
async function checkPackageVulnerabilities(purl) {
  const response = await fetch("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      purl: purl,
    }),
  });

  if (!response.ok) {
    throw new Error(`OSV API error: ${response.status}`);
  }

  const data = await response.json();
  return data.vulns || [];
}

/**
 * Fetch package information from Nixpkgs
 */
async function getLatestNixInfo(packageName) {
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
          term: {
            package_pname: packageName,
          },
        },
        size: 1,
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    logger.error(`Nix Version Fetch error: ${response.status}`, {
      response: errBody,
    });
    return null;
  }

  const data = await response.json();
  const hits = data.hits?.hits || [];
  if (hits.length > 0) {
    const source = hits[0]._source;
    return {
      version: source.package_pversion || null,
      homepage: source.package_homepage?.[0] || "",
    };
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
      "Usage: <code>/vuln &lt;package_name&gt; [version]</code>\nExample: <code>/vuln openssl</code>",
      {
        parse_mode: "HTML",
      },
    );
  }

  try {
    let resolvingMsg = null;
    let homepage = "";

    // 1. Resolve package version and homepage metadata from Nixpkgs
    if (!version) {
      resolvingMsg = await ctx.reply(
        "Connecting to Nixpkgs unstable database...",
        {
          parse_mode: "HTML",
        },
      );
      const info = await getLatestNixInfo(packageName);

      if (!info || !info.version) {
        if (resolvingMsg) {
          await ctx.api
            .deleteMessage(ctx.chat.id, resolvingMsg.message_id)
            .catch(() => {});
        }
        return ctx.reply(
          `Could not resolve the latest version for <code>${escapeHTML(packageName)}</code> on Nixpkgs.`,
          {
            parse_mode: "HTML",
          },
        );
      }
      version = info.version;
      homepage = info.homepage || "";
    } else {
      // If version is manually provided, try to fetch homepage for generating PURL
      const info = await getLatestNixInfo(packageName);
      if (info) {
        homepage = info.homepage || "";
      }
    }

    const scanningMsg = resolvingMsg
      ? await ctx.api.editMessageText(
          ctx.chat.id,
          resolvingMsg.message_id,
          `Scanning <code>${escapeHTML(packageName)}</code> v${escapeHTML(version)}...`,
          { parse_mode: "HTML" },
        )
      : await ctx.reply(
          `Scanning <code>${escapeHTML(packageName)}</code> v${escapeHTML(version)}...`,
          { parse_mode: "HTML" },
        );

    // 2. Generate standard PURL
    let purl = `pkg:generic/${packageName}@${version}`;
    const gitInfo = parseGithubUrl(homepage);
    if (gitInfo) {
      purl = `pkg:github/${gitInfo.owner}/${gitInfo.repo}@${version}`;
    }

    // 3. Scan OSV database
    const vulns = await checkPackageVulnerabilities(purl);

    if (scanningMsg) {
      await ctx.api
        .deleteMessage(ctx.chat.id, scanningMsg.message_id)
        .catch(() => {});
    }

    // 4. Render Elegant Report
    if (vulns.length === 0) {
      let replyText = `<b>V U L N E R A B I L I T Y   R E P O R T</b>\n`;
      replyText += `───────────────────────────\n`;
      replyText += `Package:  <code>${escapeHTML(packageName)}</code>\n`;
      replyText += `Version:  <code>${escapeHTML(version)}</code>\n`;
      replyText += `Status:   <b>SECURE</b> (0 vulnerabilities detected)\n`;

      return ctx.reply(replyText, {
        parse_mode: "HTML",
      });
    }

    let replyText = `<b>V U L N E R A B I L I T Y   R E P O R T</b>\n`;
    replyText += `───────────────────────────\n`;
    replyText += `Package:  <code>${escapeHTML(packageName)}</code>\n`;
    replyText += `Version:  <code>${escapeHTML(version)}</code>\n`;
    replyText += `Status:   <b>VULNERABLE</b> (${vulns.length} issues detected)\n\n`;

    const displayedVulns = vulns.slice(0, 5);
    displayedVulns.forEach((vuln) => {
      const id = escapeHTML(vuln.id || "N/A");
      const summary = escapeHTML(vuln.summary || "No summary provided.");
      const link = `https://osv.dev/vulnerability/${id}`;
      replyText += `• <b><a href="${link}">${id}</a></b>\n<i>${summary}</i>\n\n`;
    });

    if (vulns.length > 5) {
      replyText += `<i>...and ${vulns.length - 5} more vulnerabilities.</i>`;
    }

    await ctx.reply(replyText, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Error scanning vulnerabilities:", error);
    await ctx.reply("System error. Failed to perform vulnerability scan.");
  }
});

module.exports = {
  composer: cmd,
  command: "vuln",
  description: "Scan a Nix package for CVE vulnerabilities",
};
