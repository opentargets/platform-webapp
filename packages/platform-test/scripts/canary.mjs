// Runs specs with every GraphQL request aborted (E2E_CANARY=1) and fails if
// any test still passes: a test that passes without data cannot catch a broken
// page. Tests that do not depend on API data are tagged @no-data and skipped.
//
// Usage: yarn test:canary [playwright args, e.g. a spec path]
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const report = join(mkdtempSync(join(tmpdir(), "e2e-canary-")), "report.json");

spawnSync(
  "npx",
  ["playwright", "test", "--grep-invert", "@no-data", "--reporter=json", ...process.argv.slice(2)],
  {
    stdio: ["inherit", "ignore", "inherit"],
    env: { ...process.env, E2E_CANARY: "1", PLAYWRIGHT_JSON_OUTPUT_NAME: report },
  }
);

const passed = [];
let total = 0;
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      total += 1;
      if (t.results.at(-1)?.status === "passed") passed.push(`${spec.file} › ${spec.title}`);
    }
  }
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of JSON.parse(readFileSync(report, "utf8")).suites) walk(suite);

if (passed.length) {
  console.error(`\n${passed.length}/${total} tests passed without API data:\n`);
  for (const title of passed) console.error(`  ✘ ${title}`);
  process.exit(1);
}
console.log(`\nAll ${total} tests failed without API data, as expected.`);
