#!/usr/bin/env node
/**
 * Run the e2e tests from this machine against a pull request's deploy preview and
 * publish the report where the team can open it.
 *
 *   yarn e2e:publish                         the whole suite
 *   yarn e2e:publish e2e/pages/drug          only these specs
 *   yarn e2e:publish --grep @smoke           any Playwright argument is passed through
 *   yarn e2e:publish --pr 1182               test another pull request's preview
 *
 * Everything is scoped to one branch. By default that is the branch checked out:
 *   tests run against   https://deploy-preview-<its PR number>--ot-platform.netlify.app
 *   report is served at https://e2e-local-<branch>--ot-platform.netlify.app
 * With --pr <number> the tests in your checkout run against that pull request's preview
 * and the report goes to https://e2e-local-pr-<number>--ot-platform.netlify.app.
 *
 * Nothing is built: the preview is the one Netlify already deployed for the pull request.
 *
 * The published page is an overview (one row per part of the app, with what it checks
 * and its counts) in front of the Playwright report, which has a screenshot, a trace and
 * a video for each failed test. Publishing again replaces that branch's report only.
 *
 * Options (all optional):
 *   --pr <number>      the pull request whose deploy preview to test
 *   --base-url <url>   test another deployment, e.g. http://localhost:3000
 *   --alias <name>     publish under another alias
 *   --no-publish       run and build the report, do not upload it
 *
 * Needs the GitHub CLI (to find the pull request of a branch) and the Netlify CLI,
 * logged in to an account on the Open Targets team:
 *   npm install -g netlify-cli && netlify login
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOverview } from "./buildOverview.mjs";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* What gets published: index.html (the overview) and report/ (the Playwright report). */
const publishDir = resolve(packageDir, "e2e-published-report");
const reportDir = resolve(publishDir, "report");

const NETLIFY_SITE = process.env.E2E_NETLIFY_SITE || "ot-platform";
/* Netlify limits an alias to 37 characters. */
const ALIAS_LIMIT = 37;
const REPORT_PREFIX = "e2e-local-";

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(2);
}

function takeOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} needs a value.`);
  args.splice(index, 2);
  return value;
}

function takeFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

/** The same rule CI uses to turn a branch name into its deploy preview alias. */
function previewAlias(branch) {
  if (branch === "main" || branch === "master") return "e2e-main-preview";
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ALIAS_LIMIT);
}

function currentBranch() {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: packageDir,
    encoding: "utf8",
  }).trim();
  if (branch === "HEAD") {
    fail("No branch is checked out (detached HEAD). Check out the branch whose preview you want to test.");
  }
  return branch;
}

/** The open pull request of a branch, or null when it has none. */
function pullRequestOf(branch) {
  const view = spawnSync("gh", ["pr", "view", branch, "--json", "number,state", "--jq", "[.number,.state]|@tsv"], {
    cwd: packageDir,
    encoding: "utf8",
  });
  if (view.error) fail("The GitHub CLI is not installed. Install it (https://cli.github.com), or pass --pr <number> or --base-url <url>.");
  if (view.status !== 0) return null;
  const [number, state] = view.stdout.trim().split("\t");
  return state === "OPEN" ? number : null;
}

function requireNetlify() {
  /* `netlify status` also fails when the directory is not linked to a site, so ask
   * the API who we are instead. */
  const user = spawnSync("netlify", ["api", "getCurrentUser"], { encoding: "utf8", cwd: tmpdir() });
  if (user.error) {
    fail("The Netlify CLI is not installed. Run: npm install -g netlify-cli && netlify login");
  }
  if (user.status !== 0) {
    fail("The Netlify CLI is not logged in. Run: netlify login");
  }
}

async function requireReachable(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    fail(`Cannot reach ${url} (${error.message}).`);
  }
  if (!response.ok) {
    fail(
      `${url} answered HTTP ${response.status}. A branch gets its deploy preview when it has an open pull request and CI has built it; push the branch, or pass --base-url to test another deployment.`
    );
  }
}

const args = process.argv.slice(2);
const baseUrlOption = takeOption(args, "--base-url");
const aliasOption = takeOption(args, "--alias");
const prOption = takeOption(args, "--pr");
const publish = !takeFlag(args, "--no-publish");
if (prOption && !/^\d+$/.test(prOption)) fail("--pr takes a pull request number, e.g. --pr 1182.");

const branch = currentBranch();
/* With --pr the run is about that pull request; otherwise about the branch checked out. */
const prNumber = prOption ?? (baseUrlOption ? null : pullRequestOf(branch));
if (!baseUrlOption && !prNumber) {
  fail(`Branch "${branch}" has no open pull request, so it has no deploy preview. Open one, or pass --pr <number> or --base-url <url>.`);
}
const baseUrl = baseUrlOption ?? `https://deploy-preview-${prNumber}--ot-platform.netlify.app`;
const defaultAlias = prOption ? `${REPORT_PREFIX}pr-${prOption}` : `${REPORT_PREFIX}${previewAlias(branch)}`;
const reportAlias = (aliasOption ?? defaultAlias).slice(0, ALIAS_LIMIT).replace(/-+$/, "");
const reportUrl = `https://${reportAlias}--ot-platform.netlify.app`;

if (publish) requireNetlify();
await requireReachable(baseUrl);

console.log(`Tests:    branch ${branch}`);
console.log(`Testing:  ${baseUrl}${prOption ? ` (pull request #${prOption})` : ""}`);
console.log(publish ? `Report:   ${reportUrl}\n` : "Report:   not published (--no-publish)\n");

rmSync(publishDir, { recursive: true, force: true });
mkdirSync(publishDir, { recursive: true });

const run = spawnSync("yarn", ["playwright", "test", "--reporter=list,html", ...args], {
  cwd: packageDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_TEST_BASE_URL: baseUrl,
    PLAYWRIGHT_VIDEO: process.env.PLAYWRIGHT_VIDEO ?? "retain-on-failure",
    PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir,
    PLAYWRIGHT_HTML_OPEN: "never",
  },
});
const testsExitCode = run.status ?? 1;

if (!existsSync(resolve(reportDir, "index.html"))) {
  fail("Playwright did not produce a report, so there is nothing to publish.");
}

const overview = buildOverview({
  reportIndexFile: resolve(reportDir, "index.html"),
  branch,
  prNumber,
  baseUrl,
  ranAt: `${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC`,
});
writeFileSync(resolve(publishDir, "index.html"), overview.html);
const { counts } = overview;
console.log(`\n${counts.total} tests: ${counts.passed} passed, ${counts.failed} failed${counts.flaky ? `, ${counts.flaky} flaky` : ""}.`);

if (publish) {
  /* Run outside the repository so the CLI does not try to pick a monorepo project. */
  const deploy = spawnSync(
    "netlify",
    ["deploy", `--dir=${publishDir}`, `--alias=${reportAlias}`, "--site", NETLIFY_SITE, "--no-build"],
    { cwd: tmpdir(), encoding: "utf8" }
  );
  if (deploy.status !== 0) {
    fail(`Publishing the report failed:\n${deploy.stderr || deploy.stdout}`);
  }
  console.log(`Report published: ${reportUrl}`);
} else {
  console.log(`Report written to ${publishDir}`);
}

/* Exit with the tests' result, so a failing run is still a failing command. */
process.exit(testsExitCode);
