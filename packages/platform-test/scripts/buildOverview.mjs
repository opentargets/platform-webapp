import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { AREAS, areaOf, OTHER_AREA } from "./reportAreas.mjs";

/**
 * Build the overview page for a run: one row per part of the app, with what it checks,
 * its counts, its spec files and failed tests, and links into the Playwright report
 * (served from ./report/). The output is one static HTML file with inline CSS and a small
 * inline script; with JavaScript off the table and its disclosures still work.
 *
 * The data comes from the Playwright HTML report itself, so every link uses the ids and
 * paths that report understands.
 */

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const STYLES = readFileSync(resolve(scriptsDir, "reportOverview.css"), "utf8");
const LOGO_FILE = resolve(scriptsDir, "../../../apps/platform/public/assets/img/ot-logo-small.png");
const REPORT = "report/index.html";

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

/* ---------- reading the Playwright HTML report ---------- */

/** Read one file out of a zip archive held in memory (stored or deflated entries). */
function readZipEntry(zip, wanted) {
  const END_SIGNATURE = 0x06054b50;
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== END_SIGNATURE) end--;
  if (end < 0) throw new Error("The report data is not a zip archive.");
  const entries = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  for (let i = 0; i < entries; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeader = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (name === wanted) {
      const dataStart =
        localHeader + 30 + zip.readUInt16LE(localHeader + 26) + zip.readUInt16LE(localHeader + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      return method === 0 ? data : inflateRawSync(data);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`The report data has no ${wanted}.`);
}

const ANSI = /\u001b\[[0-9;]*m/g;

/** The first line of the first error of a test's last attempt, without colour codes. */
function firstErrorLine(result) {
  const error = result?.errors?.[0];
  const message = typeof error === "string" ? error : (error?.message ?? "");
  return message.replace(ANSI, "").split("\n").find((line) => line.trim())?.trim() ?? "";
}

/**
 * Every test of a Playwright HTML report:
 * { id, file, line, suite, title, tags, outcome, video, screenshot, error }.
 * `video` and `screenshot` are paths relative to the report folder, from the last attempt.
 */
function readReportTests(reportIndexFile) {
  const html = readFileSync(reportIndexFile, "utf8");
  const embedded = html.match(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/);
  if (!embedded) throw new Error(`${reportIndexFile} is not a Playwright HTML report.`);
  const zip = Buffer.from(embedded[1], "base64");
  const report = JSON.parse(readZipEntry(zip, "report.json").toString("utf8"));
  const outcomes = { expected: "passed", unexpected: "failed", flaky: "flaky", skipped: "skipped" };
  return report.files.flatMap((file) => {
    /* The per-file entry carries the error messages; only read it when something failed. */
    const failedHere = file.tests.some((test) => test.outcome === "unexpected");
    const details = failedHere ? JSON.parse(readZipEntry(zip, `${file.fileId}.json`).toString("utf8")).tests : [];
    return file.tests.map((test) => {
      const lastResult = test.results?.at(-1);
      const attachment = (name) => lastResult?.attachments?.find((item) => item.name === name)?.path ?? null;
      const detail = details.find((item) => item.testId === test.testId);
      return {
        id: test.testId,
        file: file.fileName,
        line: test.location?.line ?? null,
        suite: test.path ?? [],
        title: test.title,
        tags: test.tags ?? [],
        outcome: outcomes[test.outcome] ?? "failed",
        video: attachment("video"),
        screenshot: attachment("screenshot"),
        error: firstErrorLine(detail?.results?.at(-1)),
      };
    });
  });
}

/* ---------- counting and links ---------- */

function count(tests) {
  const counts = { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
  for (const test of tests) {
    counts.total++;
    counts[test.outcome]++;
  }
  return counts;
}

/** Link into the Playwright report, filtered to some text (a file path, a status). */
const filtered = (query) => `${REPORT}#?q=${encodeURIComponent(query)}`;
const testLink = (id) => `${REPORT}#?testId=${encodeURIComponent(id)}`;

/** What identifies an area in the report filter: its one file, or the folder its files share. */
function areaPath(files) {
  if (files.length === 1) return files[0];
  let prefix = files[0];
  for (const file of files) {
    while (!file.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix.slice(0, prefix.lastIndexOf("/") + 1);
}

/** A title without its trailing tags ("… @smoke"), and those tags. */
function splitTags(test) {
  let title = test.title;
  const tags = [];
  for (let match = title.match(/\s(@[\w-]+)$/); match; match = title.match(/\s(@[\w-]+)$/)) {
    tags.unshift(match[1]);
    title = title.slice(0, match.index);
  }
  return { title, tags };
}

/** Where the page of an area's failed tests and their videos is published. */
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const failedPagePath = (area) => `failed/${slug(area.name)}.html`;
const ALL_FAILED_PAGE = "failed/all.html";

/* ---------- markup ---------- */

function failedTestRow(test) {
  const { title, tags } = splitTags(test);
  const suite = test.suite.length ? `<span class="fail__suite">${escapeHtml(test.suite.join(" › "))} › </span>` : "";
  const pills = tags.map((tag) => ` <span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `<li><a class="fail" href="${testLink(test.id)}"><span>${suite}${escapeHtml(title)}${pills}</span></a></li>`;
}

function specFile(file, tests) {
  const counts = count(tests);
  const failures = tests.filter((test) => test.outcome === "failed");
  return `<li>
  <div class="spec__head"><a href="${filtered(file)}">${escapeHtml(file)}</a><span>${counts.passed}/${counts.total} passed</span>${
    counts.failed ? `<span class="spec__failed">${counts.failed} failed</span>` : ""
  }</div>${failures.length ? `\n  <ul class="fails">${failures.map(failedTestRow).join("")}</ul>` : ""}
</li>`;
}

function areaRow(area, tests) {
  const counts = count(tests);
  const files = [...new Set(tests.map((test) => test.file))].sort();
  const path = areaPath(files);
  return `<tr data-failed="${counts.failed}">
  <td>
    <div class="area__name">${escapeHtml(area.name)}</div>
    <div class="area__counts"><span class="pass">${counts.passed}/${counts.total} passed</span>${
      counts.failed ? `<span class="fail">${counts.failed}/${counts.total} failed</span>` : ""
    }</div>
  </td>
  <td>
    <div class="desc">${escapeHtml(area.description)}</div>
    <details class="specs">
      <summary>${files.length} spec file${files.length === 1 ? "" : "s"}</summary>
      <ul class="speclist">${files.map((file) => specFile(file, tests.filter((test) => test.file === file))).join("")}</ul>
    </details>
  </td>
  <td>${counts.total}</td>
  <td class="passed">${counts.passed}</td>
  <td class="failed">${
    counts.failed
      ? `<a href="${failedPagePath(area)}" target="_blank" rel="noopener" title="Videos of the ${counts.failed} failed test${counts.failed === 1 ? "" : "s"} (opens in a new tab)">${counts.failed}</a>`
      : `<span class="zero">0</span>`
  }</td>
  <td>${counts.flaky || ""}</td>
  <td><a href="${filtered(path)}">Open report</a></td>
</tr>`;
}

/** The document around a page body: fonts, styles and the nav strip. `up` is the path back to the publish root. */
function pageShell({ title, body, up = "", script = "" }) {
  const logo = `data:image/png;base64,${readFileSync(LOGO_FILE).toString("base64")}`;
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400&display=swap" rel="stylesheet">
<style>
${STYLES}</style>
</head>
<body>
<div class="nav"><div class="nav__inner">
  <img class="nav__logo" src="${logo}" alt="Open Targets">
  <span>Open Targets <span class="nav__dim">Platform</span></span>
  <span class="nav__sep">/</span><a class="nav__page" href="${up}index.html">E2E report</a>
</div></div>
${body}${script ? `\n<script>${script}\n</script>` : ""}
</body>
</html>
`;
}

/** One failed test on a videos page: what failed, why, and the recording. */
function failedTestCard(test, up) {
  const { title, tags } = splitTags(test);
  const suite = test.suite.length ? `<span class="fail__suite">${escapeHtml(test.suite.join(" › "))} › </span>` : "";
  const pills = tags.map((tag) => ` <span class="tag">${escapeHtml(tag)}</span>`).join("");
  const media = test.video
    ? `<video class="video__player" controls preload="none"${test.screenshot ? ` poster="${up}report/${escapeHtml(test.screenshot)}"` : ""} src="${up}report/${escapeHtml(test.video)}"></video>`
    : `<div class="video__none">No video was recorded for this test.</div>`;
  return `<li class="video">
  <div class="video__title">${suite}${escapeHtml(title)}${pills}</div>
  <div class="video__meta"><span class="mono">${escapeHtml(test.file)}${test.line ? `:${test.line}` : ""}</span><a href="${up}${testLink(test.id)}">Steps, trace and screenshot</a></div>
  ${test.error ? `<div class="video__error">${escapeHtml(test.error.slice(0, 400))}</div>` : ""}
  ${media}
</li>`;
}

/** The page listing the failed tests of one area (or of the whole run) with their videos. */
function failedPage({ heading, description, tests, run }) {
  const up = "../";
  const failures = tests.filter((test) => test.outcome === "failed");
  const withVideo = failures.filter((test) => test.video).length;
  const files = [...new Set(failures.map((test) => test.file))].sort();
  const groups = files
    .map((file) => {
      const fileFailures = failures.filter((test) => test.file === file);
      return `<section class="videogroup">
  <h2><a class="mono" href="${up}${filtered(`s:failed ${file}`)}">${escapeHtml(file)}</a> <span class="spec__failed">${fileFailures.length} failed</span></h2>
  <ul class="videos">${fileFailures.map((test) => failedTestCard(test, up)).join("")}</ul>
</section>`;
    })
    .join("\n");
  const body = `<main class="page">
  <p class="back"><a href="${up}index.html">All areas</a></p>
  <h1>${escapeHtml(heading)}</h1>
  <div class="meta">
    ${run.prNumber ? `<span class="labelchip"><span>PR</span><span>#${escapeHtml(run.prNumber)}</span></span>` : ""}
    <span class="mono">${escapeHtml(run.branch)}</span>
    <span>tested against <a href="${escapeHtml(run.baseUrl)}">${escapeHtml(run.baseUrl.replace(/^https?:\/\//, ""))}</a></span>
    <span class="meta__time">${escapeHtml(run.ranAt)}</span>
  </div>
  <div class="totals">
    <span class="totals__failed">${failures.length} <small>failed test${failures.length === 1 ? "" : "s"}</small></span>
    <span class="totals__other">${withVideo} <small>with a video</small></span>
  </div>
  <p class="intro">${escapeHtml(description)} Each video is the recording of the failed run. The link beside a test opens its steps, trace and screenshot in the report.</p>
${groups}
</main>`;
  return pageShell({ title: `${heading}: E2E test report`, body, up });
}

const CONTROLS_SCRIPT = `
document.documentElement.classList.remove('no-js');
document.querySelectorAll('[data-expand]').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('details.specs').forEach(function (details) { details.open = button.dataset.expand === 'true'; });
  });
});
document.querySelectorAll('[data-filter]').forEach(function (button) {
  button.addEventListener('click', function () {
    var failing = button.dataset.filter === 'failing';
    document.querySelectorAll('[data-filter]').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
    document.querySelectorAll('tbody tr[data-failed]').forEach(function (row) { row.hidden = failing && row.dataset.failed === '0'; });
  });
});`;

/**
 * @param {object} options
 * @param {string} options.reportIndexFile  index.html of the Playwright HTML report
 * @param {string} options.branch           branch the tests were run from
 * @param {string|null} options.prNumber    pull request under test, if the run is for one
 * @param {string} options.baseUrl          deployment under test
 * @param {string} options.ranAt            time of the run, "YYYY-MM-DD HH:MM UTC"
 * @returns {{ html: string, counts: ReturnType<typeof count>, pages: { path: string, html: string }[] }}
 *   `pages` are the per-area pages of failed tests and their videos, paths relative to the publish folder
 */
export function buildOverview({ reportIndexFile, branch, prNumber, baseUrl, ranAt }) {
  const tests = readReportTests(reportIndexFile);
  const totals = count(tests);

  const rows = [...AREAS, OTHER_AREA]
    .map((area) => ({ area, tests: tests.filter((test) => areaOf(test.file) === area) }))
    .filter((row) => row.tests.length > 0)
    .map((row) => areaRow(row.area, row.tests))
    .join("\n");

  const run = { branch, prNumber, baseUrl, ranAt };
  const byArea = [...AREAS, OTHER_AREA]
    .map((area) => ({ area, tests: tests.filter((test) => areaOf(test.file) === area) }))
    .filter((row) => row.tests.length > 0);

  const passWidth = totals.total ? ((100 * totals.passed) / totals.total).toFixed(2) : "100";
  const chip = prNumber ? `<span class="labelchip"><span>PR</span><span>#${escapeHtml(prNumber)}</span></span>` : "";
  const failedTotal = totals.failed
    ? `<span class="totals__failed">${totals.failed} <small>failed</small></span>`
    : `<span class="totals__failed totals__failed--none">0 <small>failed</small></span>`;
  const otherTotals = [
    totals.flaky ? `<span class="totals__other">${totals.flaky} <small>flaky (passed on retry)</small></span>` : "",
    totals.skipped ? `<span class="totals__other">${totals.skipped} <small>skipped</small></span>` : "",
  ].join("");

  const body = `<main class="page">
  <h1>End-to-end test report</h1>
  <div class="meta">
    ${chip}
    <span class="mono">${escapeHtml(branch)}</span>
    <span>tested against <a href="${escapeHtml(baseUrl)}">${escapeHtml(baseUrl.replace(/^https?:\/\//, ""))}</a></span>
    <span class="meta__time">${escapeHtml(ranAt)}</span>
  </div>

  <div class="totals">
    <span class="totals__tests">${totals.total} <small>tests</small></span>
    <span class="totals__passed">${totals.passed} <small>passed</small></span>
    ${failedTotal}${otherTotals}
  </div>
  <div class="bar"><div class="bar__pass" style="width:${passWidth}%"></div>${totals.failed ? `<div class="bar__fail"></div>` : ""}</div>
  <p class="intro">Each row is one part of the app. A failed count opens the videos of those failed tests; the report behind it has the steps, a screenshot and a trace for each. <a href="${REPORT}">Open the full report</a>${
    totals.failed ? ` or <a href="${filtered("s:failed")}">only the failed tests</a>` : ""
  }.</p>

  <div class="card">
    <div class="toolbar">
      <div class="btngroup">
        <button type="button" data-filter="all" aria-pressed="true">All areas</button>
        <button type="button" data-filter="failing" aria-pressed="false">With failures</button>
      </div>
      <div class="toolbar__buttons">
        <button type="button" class="btn" data-expand="true">Expand all</button>
        <button type="button" class="btn" data-expand="false">Collapse all</button>
      </div>
    </div>
    <div class="tablewrap"><table>
      <thead><tr><th>Area</th><th>What it checks</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Report</th></tr></thead>
      <tbody>
${rows}
<tr class="total">
  <td colspan="2">Total</td><td>${totals.total}</td><td class="passed">${totals.passed}</td><td class="failed">${
    totals.failed ? `<a href="${ALL_FAILED_PAGE}" target="_blank" rel="noopener" title="Videos of every failed test (opens in a new tab)">${totals.failed}</a>` : "0"
  }</td><td>${totals.flaky || ""}</td>
  <td><a href="${REPORT}">Full report</a></td>
</tr>
      </tbody>
    </table></div>
  </div>
</main>`;
  const html = pageShell({
    title: `E2E test report: ${branch}${prNumber ? `, PR #${prNumber}` : ""}`,
    body,
    script: CONTROLS_SCRIPT,
  });

  /* One page of failed tests and their videos per area with failures, and one for the whole run. */
  const pages = byArea
    .filter((row) => row.tests.some((test) => test.outcome === "failed"))
    .map((row) => ({
      path: failedPagePath(row.area),
      html: failedPage({ heading: `Failed tests: ${row.area.name}`, description: row.area.description, tests: row.tests, run }),
    }));
  if (totals.failed) {
    pages.push({
      path: ALL_FAILED_PAGE,
      html: failedPage({ heading: "Failed tests: whole run", description: "Every failed test of this run, by spec file.", tests, run }),
    });
  }

  return { html, counts: totals, pages };
}

/** Write the overview and its pages of failed tests into the publish folder. */
export function writeOverview(publishDir, overview) {
  writeFileSync(resolve(publishDir, "index.html"), overview.html);
  for (const page of overview.pages) {
    const file = resolve(publishDir, page.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page.html);
  }
}

/* Rebuild the overview of an existing report folder without rerunning the tests:
 *   node scripts/buildOverview.mjs <publish dir> --branch <name> --base-url <url> --ran-at "<time>" [--pr <number>] */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [publishDir, ...rest] = process.argv.slice(2);
  const option = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : null);
  if (!publishDir || !option("--branch") || !option("--base-url") || !option("--ran-at")) {
    console.error('Usage: node scripts/buildOverview.mjs <publish dir> --branch <name> --base-url <url> --ran-at "<time>" [--pr <number>]');
    process.exit(2);
  }
  const overview = buildOverview({
    reportIndexFile: resolve(publishDir, REPORT),
    branch: option("--branch"),
    prNumber: option("--pr"),
    baseUrl: option("--base-url"),
    ranAt: option("--ran-at"),
  });
  writeOverview(publishDir, overview);
  const { counts } = overview;
  console.log(`${counts.total} tests: ${counts.passed} passed, ${counts.failed} failed.`);
}
