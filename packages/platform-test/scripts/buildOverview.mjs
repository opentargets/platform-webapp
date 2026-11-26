import { readFileSync } from "node:fs";
import { AREAS, areaOf, OTHER_AREA } from "./reportAreas.mjs";

/**
 * Build the overview page for a run: one row per part of the app, with what it checks,
 * its counts and links into the Playwright report (served from ./report/).
 */

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

/** Every spec in a Playwright JSON report, flattened: { file, title, outcome }. */
function collectSpecs(report) {
  const specs = [];
  const visit = (suite, file, titles) => {
    const suiteFile = suite.file ?? file;
    const suiteTitles = suite.title && suite.title !== suiteFile ? [...titles, suite.title] : titles;
    for (const spec of suite.specs ?? []) {
      const statuses = (spec.tests ?? []).map((test) => test.status);
      let outcome = "passed";
      if (statuses.includes("unexpected")) outcome = "failed";
      else if (statuses.includes("flaky")) outcome = "flaky";
      else if (statuses.length > 0 && statuses.every((status) => status === "skipped")) outcome = "skipped";
      specs.push({ file: spec.file ?? suiteFile, title: [...suiteTitles, spec.title].join(" › "), outcome });
    }
    for (const child of suite.suites ?? []) visit(child, suiteFile, suiteTitles);
  };
  for (const suite of report.suites ?? []) visit(suite, suite.file ?? "", []);
  return specs;
}

const emptyCounts = () => ({ total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 });

function count(specs) {
  const counts = emptyCounts();
  for (const spec of specs) {
    counts.total++;
    counts[spec.outcome]++;
  }
  return counts;
}

/** Link into the Playwright report, filtered to some text (a file path, a status). */
const reportLink = (query) => `report/index.html#?q=${encodeURIComponent(query)}`;

/**
 * @param {object} options
 * @param {string} options.resultsFile  Playwright JSON reporter output
 * @param {string} options.branch       branch the tests were run from
 * @param {string} options.baseUrl      deployment under test
 * @param {string} options.ranAt        human-readable time of the run
 * @returns {{ html: string, counts: ReturnType<typeof emptyCounts> }}
 */
export function buildOverview({ resultsFile, branch, baseUrl, ranAt }) {
  const specs = collectSpecs(JSON.parse(readFileSync(resultsFile, "utf8")));
  const totals = count(specs);

  const rows = [...AREAS, OTHER_AREA]
    .map((area) => ({ area, specs: specs.filter((spec) => areaOf(spec.file) === area) }))
    .filter(({ specs: areaSpecs }) => areaSpecs.length > 0)
    .map(({ area, specs: areaSpecs }) => {
      const counts = count(areaSpecs);
      const files = [...new Set(areaSpecs.map((spec) => spec.file))].sort();
      const fileItems = files
        .map((file) => {
          const fileSpecs = areaSpecs.filter((spec) => spec.file === file);
          const fileCounts = count(fileSpecs);
          const failures = fileSpecs
            .filter((spec) => spec.outcome === "failed")
            .map((spec) => `<li class="failure">${escapeHtml(spec.title)}</li>`)
            .join("");
          const summary = `${fileCounts.passed}/${fileCounts.total} passed${fileCounts.failed ? `, <b class="bad">${fileCounts.failed} failed</b>` : ""}`;
          return `<li><a href="${reportLink(file)}"><code>${escapeHtml(file)}</code></a>: ${summary}${failures ? `<ul>${failures}</ul>` : ""}</li>`;
        })
        .join("");
      const failed = counts.failed
        ? `<a class="bad" href="${reportLink(`s:failed ${commonPrefix(files)}`)}"><b>${counts.failed}</b></a>`
        : "0";
      return `<tr>
  <td><b>${escapeHtml(area.name)}</b></td>
  <td>${escapeHtml(area.description)}
    <details><summary>${files.length} spec file${files.length === 1 ? "" : "s"}</summary><ul>${fileItems}</ul></details></td>
  <td>${counts.total}</td><td class="good">${counts.passed}</td><td>${failed}</td><td>${counts.flaky || ""}</td>
  <td><a href="${reportLink(commonPrefix(files))}">open report</a></td>
</tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>E2E test report: ${escapeHtml(branch)}</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1150px;padding:0 16px;color:#1f1f1f}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{white-space:nowrap}
.good{color:#1b6e3c}.bad{color:#b3261e}details{margin-top:6px}summary{cursor:pointer;color:#555}li{margin:3px 0}.failure{color:#b3261e}code{font-size:12px}
</style></head><body>
<h1>End-to-end test report</h1>
<p>Branch <code>${escapeHtml(branch)}</code>, tested against <a href="${escapeHtml(baseUrl)}">${escapeHtml(baseUrl)}</a>, ${escapeHtml(ranAt)}.</p>
<p><b>${totals.total}</b> tests: <b class="good">${totals.passed} passed</b>, <b class="bad">${totals.failed} failed</b>${totals.flaky ? `, ${totals.flaky} flaky (passed on retry)` : ""}${totals.skipped ? `, ${totals.skipped} skipped` : ""}.
Each row is one part of the app. A failed test has a screenshot, a trace and a video in the report.
<a href="report/index.html">Open the full report</a>${totals.failed ? ` or <a href="${reportLink("s:failed")}">only the failed tests</a>` : ""}.</p>
<table><tr><th>Area</th><th>What it checks</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Report</th></tr>
${rows}
</table>
</body></html>
`;
  return { html, counts: totals };
}

/** The longest path prefix (ending at a "/" or the whole name) shared by the files. */
function commonPrefix(files) {
  if (files.length === 1) return files[0];
  let prefix = files[0];
  for (const file of files) {
    while (!file.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const slash = prefix.lastIndexOf("/");
  return slash === -1 ? "" : prefix.slice(0, slash + 1);
}
