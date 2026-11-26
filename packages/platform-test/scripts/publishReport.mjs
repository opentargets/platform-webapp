#!/usr/bin/env node
/**
 * Run the e2e tests from this machine against the current branch's deploy preview and
 * publish the report where the team can open it.
 *
 *   yarn e2e:publish                         the whole suite
 *   yarn e2e:publish e2e/pages/drug          only these specs
 *   yarn e2e:publish --grep @smoke           any Playwright argument is passed through
 *
 * Everything is scoped to the branch that is checked out:
 *   tests run against   https://<branch>--ot-platform.netlify.app      (the deploy preview)
 *   report is served at https://e2e-local-<branch>--ot-platform.netlify.app
 *
 * The report has a screenshot, a trace and a video for each failed test. Publishing the
 * same branch again replaces its report; other branches are not touched.
 *
 * Options (all optional):
 *   --base-url <url>   test another deployment, e.g. http://localhost:3000
 *   --alias <name>     publish under another alias
 *   --no-publish       run and build the report, do not upload it
 *
 * Needs the Netlify CLI, logged in to an account on the Open Targets team:
 *   npm install -g netlify-cli && netlify login
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = resolve(packageDir, "playwright-report");
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
const publish = !takeFlag(args, "--no-publish");

const branch = currentBranch();
const alias = previewAlias(branch);
const baseUrl = baseUrlOption ?? `https://${alias}--ot-platform.netlify.app`;
const reportAlias = (aliasOption ?? `${REPORT_PREFIX}${alias}`).slice(0, ALIAS_LIMIT).replace(/-+$/, "");
const reportUrl = `https://${reportAlias}--ot-platform.netlify.app`;

if (publish) requireNetlify();
await requireReachable(baseUrl);

console.log(`Branch:   ${branch}`);
console.log(`Testing:  ${baseUrl}`);
console.log(publish ? `Report:   ${reportUrl}\n` : "Report:   not published (--no-publish)\n");

const run = spawnSync("yarn", ["playwright", "test", ...args], {
  cwd: packageDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_TEST_BASE_URL: baseUrl,
    PLAYWRIGHT_VIDEO: process.env.PLAYWRIGHT_VIDEO ?? "retain-on-failure",
    PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir,
  },
});
const testsExitCode = run.status ?? 1;

if (!existsSync(resolve(reportDir, "index.html"))) {
  fail("Playwright did not produce a report, so there is nothing to publish.");
}

if (publish) {
  /* Run outside the repository so the CLI does not try to pick a monorepo project. */
  const deploy = spawnSync(
    "netlify",
    ["deploy", `--dir=${reportDir}`, `--alias=${reportAlias}`, "--site", NETLIFY_SITE, "--no-build"],
    { cwd: tmpdir(), encoding: "utf8" }
  );
  if (deploy.status !== 0) {
    fail(`Publishing the report failed:\n${deploy.stderr || deploy.stdout}`);
  }
  console.log(`\nReport published: ${reportUrl}`);
} else {
  console.log(`\nReport written to ${reportDir}`);
}

/* Exit with the tests' result, so a failing run is still a failing command. */
process.exit(testsExitCode);
