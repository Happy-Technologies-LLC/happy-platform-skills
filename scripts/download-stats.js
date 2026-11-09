#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const NPM_PACKAGES = [
  { name: "happy-platform-skills", project: "skills", status: "current" },
  { name: "happy-servicenow-skills", project: "skills", status: "legacy" },
  { name: "happy-platform-mcp", project: "mcp", status: "current" },
  { name: "servicenow-mcp-server", project: "mcp", status: "legacy" },
];

const DOCKER_REPOSITORIES = [
  { name: "nczitzer/happy-platform-mcp", project: "mcp", status: "current" },
  { name: "nczitzer/mcp-servicenow-nodejs", project: "mcp", status: "legacy" },
];

const GITHUB_REPOSITORIES = [
  {
    name: "Happy-Technologies-LLC/happy-platform-skills",
    project: "skills",
    status: "current",
  },
  {
    name: "Happy-Technologies-LLC/happy-platform-mcp",
    project: "mcp",
    status: "current",
  },
];

const SKILLS_SH_REPO =
  "https://skills.sh/happy-technologies-llc/happy-platform-skills";
const FEATURED_SKILLS = [
  "happy-platform-skills",
  "mcp-server-installation",
  "fluent-sdk",
];

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders(url) });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

let cachedGithubToken;

function getGithubToken() {
  if (cachedGithubToken !== undefined) return cachedGithubToken;

  cachedGithubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (cachedGithubToken) return cachedGithubToken;

  try {
    cachedGithubToken = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    cachedGithubToken = "";
  }

  return cachedGithubToken;
}

function githubHeaders(url) {
  if (!url.startsWith("https://api.github.com/")) return {};

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = getGithubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

function stripHtml(value) {
  return value
    .replace(/<!--\s*-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// skills.sh renders large counts compactly ("7.9K"); expand suffixes to numbers.
function parseCompactNumber(value) {
  const match = value.replace(/,/g, "").match(/^([\d.]+)([KM]?)$/i);
  if (!match) return null;
  const scale = { "": 1, K: 1e3, M: 1e6 }[match[2].toUpperCase()];
  return Math.round(Number(match[1]) * scale);
}

function parseSkillsShRepo(html) {
  const skillCountMatch = html.match(
    />([\d,]+)(?:\s|<!--\s*-->)*skills</i,
  );
  const totalInstallsMatch = html.match(
    />([\d.,]+[KM]?)\s*<!--\s*-->\s*total installs</i,
  );
  const skillRows = [];
  const rowPattern =
    /href="\/happy-technologies-llc\/happy-platform-skills\/([^"]+)".{0,1200}?<h3[^>]*>([^<]+)<\/h3>.{0,500}?<span[^>]*>([\d,]+)<\/span>/gs;

  for (const match of html.matchAll(rowPattern)) {
    skillRows.push({
      slug: stripHtml(match[1]),
      name: stripHtml(match[2]),
      installs: Number(match[3].replace(/,/g, "")),
    });
  }

  return {
    url: SKILLS_SH_REPO,
    skillCount: skillCountMatch
      ? Number(skillCountMatch[1].replace(/,/g, ""))
      : null,
    totalInstalls: totalInstallsMatch
      ? parseCompactNumber(totalInstallsMatch[1])
      : null,
    // A repo-level `npx skills add` is counted once per skill, so the sum is inflated
    // roughly skill-count-fold; the top skill's count is the closest figure to real installs.
    maxSkillInstalls: skillRows.length
      ? Math.max(...skillRows.map((row) => row.installs))
      : null,
    sumOfSkillInstalls: skillRows.reduce((sum, row) => sum + row.installs, 0),
    topSkills: [...skillRows]
      .sort((a, b) => b.installs - a.installs)
      .slice(0, 10),
  };
}

// skills.sh shows weekly installs only as a sparkline: aria-label="Weekly installs: 1, 5, 2, 0".
// Bucket order and whether the last bucket is a partial week are not documented, so return
// the whole series rather than picking one week.
function parseWeeklyInstalls(html) {
  const match = html.match(/aria-label="Weekly installs:\s*([\d,\s]+)"/i);
  if (!match) return null;
  return match[1].split(",").map((value) => Number(value.trim()));
}

async function getNpmStats(packageInfo) {
  const packageName = packageInfo.name;
  const [lastWeek, lastMonth, metadata] = await Promise.all([
    fetchJson(`https://api.npmjs.org/downloads/point/last-week/${packageName}`),
    fetchJson(
      `https://api.npmjs.org/downloads/point/last-month/${packageName}`,
    ),
    fetchJson(`https://registry.npmjs.org/${packageName}`),
  ]);
  const publishedAt = metadata.time?.created?.slice(0, 10) ?? "2025-10-17";
  const today = new Date().toISOString().slice(0, 10);
  const lifetime = await fetchJson(
    `https://api.npmjs.org/downloads/range/${publishedAt}:${today}/${packageName}`,
  );
  const totalDownloads = lifetime.downloads.reduce(
    (total, day) => total + day.downloads,
    0,
  );

  return {
    project: packageInfo.project,
    status: packageInfo.status,
    package: packageName,
    version: metadata["dist-tags"]?.latest,
    npmUrl: `https://www.npmjs.com/package/${packageName}`,
    lastWeekDownloads: lastWeek.downloads,
    lastWeekRange: `${lastWeek.start}..${lastWeek.end}`,
    lastMonthDownloads: lastMonth.downloads,
    lastMonthRange: `${lastMonth.start}..${lastMonth.end}`,
    totalDownloads,
    totalRange: `${lifetime.start}..${lifetime.end}`,
  };
}

async function getDockerStats(repoInfo) {
  const repository = await fetchJson(
    `https://hub.docker.com/v2/repositories/${repoInfo.name}/`,
  );

  return {
    project: repoInfo.project,
    status: repoInfo.status,
    repository: repoInfo.name,
    dockerHubUrl: `https://hub.docker.com/r/${repoInfo.name}`,
    pullCount: repository.pull_count,
    starCount: repository.star_count,
    lastUpdated: repository.last_updated,
    dateRegistered: repository.date_registered,
  };
}

async function getGithubTraffic(repoName, kind) {
  try {
    const traffic = await fetchJson(
      `https://api.github.com/repos/${repoName}/traffic/${kind}`,
    );
    return {
      count: traffic.count,
      uniques: traffic.uniques,
      available: true,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

async function getGithubStats(repoInfo) {
  const repository = await fetchJson(
    `https://api.github.com/repos/${repoInfo.name}`,
  );
  const [views, clones] = await Promise.all([
    getGithubTraffic(repoInfo.name, "views"),
    getGithubTraffic(repoInfo.name, "clones"),
  ]);

  return {
    project: repoInfo.project,
    status: repoInfo.status,
    repository: repoInfo.name,
    githubUrl: repository.html_url,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    watchers: repository.subscribers_count,
    openIssues: repository.open_issues_count,
    pushedAt: repository.pushed_at,
    traffic: {
      views,
      clones,
    },
  };
}

async function getSkillsShStats() {
  const [repoHtml, featuredSkillPages] = await Promise.all([
    fetchText(SKILLS_SH_REPO),
    Promise.all(
      FEATURED_SKILLS.map(async (skill) => ({
        slug: skill,
        url: `${SKILLS_SH_REPO}/${skill}`,
        html: await fetchText(`${SKILLS_SH_REPO}/${skill}`),
      })),
    ),
  ]);

  return {
    ...parseSkillsShRepo(repoHtml),
    featuredWeeklyInstalls: featuredSkillPages.map((page) => ({
      slug: page.slug,
      url: page.url,
      weeklyInstalls: parseWeeklyInstalls(page.html),
    })),
  };
}

function groupTotals(items, valueKey) {
  return items.reduce((totals, item) => {
    totals[item.project] ??= 0;
    totals[item.project] += item[valueKey] ?? 0;
    return totals;
  }, {});
}

function formatNumber(value) {
  return value == null ? "n/a" : value.toLocaleString("en-US");
}

function printHuman(stats) {
  console.log("Download and install stats\n");
  console.log(`Generated: ${stats.generatedAt}`);
  console.log("\nnpm downloads:");
  for (const item of stats.npm) {
    console.log(
      `- ${item.package}@${item.version} (${item.project}, ${item.status}): ${formatNumber(item.lastWeekDownloads)} last week (${item.lastWeekRange}); ${formatNumber(item.lastMonthDownloads)} last month (${item.lastMonthRange})`,
    );
    console.log(
      `  total since publish: ${formatNumber(item.totalDownloads)} (${item.totalRange})`,
    );
  }
  console.log(
    `- combined skills npm: ${formatNumber(stats.totals.npmLastWeek.skills)} last week; ${formatNumber(stats.totals.npmLastMonth.skills)} last month`,
  );
  console.log(
    `  combined skills npm total: ${formatNumber(stats.totals.npmTotal.skills)}`,
  );
  console.log(
    `- combined MCP npm: ${formatNumber(stats.totals.npmLastWeek.mcp)} last week; ${formatNumber(stats.totals.npmLastMonth.mcp)} last month`,
  );
  console.log(
    `  combined MCP npm total: ${formatNumber(stats.totals.npmTotal.mcp)}`,
  );

  console.log("\nDocker Hub pulls:");
  for (const item of stats.dockerHub) {
    console.log(
      `- ${item.repository} (${item.status}): ${formatNumber(item.pullCount)} pulls; updated ${item.lastUpdated}`,
    );
  }
  console.log(
    `- combined MCP Docker pulls: ${formatNumber(stats.totals.dockerPulls.mcp)}`,
  );

  console.log("\nGitHub:");
  for (const item of stats.github) {
    const views = item.traffic.views.available
      ? `${formatNumber(item.traffic.views.count)} views / ${formatNumber(item.traffic.views.uniques)} uniques`
      : "views unavailable";
    const clones = item.traffic.clones.available
      ? `${formatNumber(item.traffic.clones.count)} clones / ${formatNumber(item.traffic.clones.uniques)} uniques`
      : "clones unavailable";
    console.log(
      `- ${item.repository}: ${formatNumber(item.stars)} stars, ${formatNumber(item.forks)} forks, ${formatNumber(item.watchers)} watchers; ${views}; ${clones}`,
    );
  }

  console.log("\nskills.sh installs:");
  console.log(
    `- ${stats.skillsSh.url}: ~${formatNumber(stats.skillsSh.maxSkillInstalls)} installs (top skill; a repo install counts once per skill, so the page's ${formatNumber(stats.skillsSh.totalInstalls)} "total installs" / per-skill sum ${formatNumber(stats.skillsSh.sumOfSkillInstalls)} is inflated) across ${formatNumber(stats.skillsSh.skillCount)} indexed skills`,
  );
  for (const item of stats.skillsSh.featuredWeeklyInstalls) {
    console.log(
      `- ${item.slug}: weekly installs sparkline [${item.weeklyInstalls?.join(", ") ?? "n/a"}] (order unverified; last bucket may be partial)`,
    );
  }

  if (stats.skillsSh.topSkills.length > 0) {
    console.log("\nTop skills on skills.sh:");
    for (const skill of stats.skillsSh.topSkills) {
      console.log(`- ${skill.name}: ${formatNumber(skill.installs)} installs`);
    }
  }
}

async function main() {
  const json = process.argv.includes("--json");
  const stats = {
    generatedAt: new Date().toISOString(),
    npm: await Promise.all(NPM_PACKAGES.map(getNpmStats)),
    dockerHub: await Promise.all(DOCKER_REPOSITORIES.map(getDockerStats)),
    github: await Promise.all(GITHUB_REPOSITORIES.map(getGithubStats)),
    skillsSh: await getSkillsShStats(),
  };
  stats.totals = {
    npmLastWeek: groupTotals(stats.npm, "lastWeekDownloads"),
    npmLastMonth: groupTotals(stats.npm, "lastMonthDownloads"),
    npmTotal: groupTotals(stats.npm, "totalDownloads"),
    dockerPulls: groupTotals(stats.dockerHub, "pullCount"),
  };

  if (json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  printHuman(stats);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
