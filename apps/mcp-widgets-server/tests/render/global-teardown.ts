import { readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";

const MATRIX_DIR = resolve(import.meta.dirname, "../../test-results/render-matrix");

function blockedOrigins(violations: string[]): string[] {
  const origins = violations
    .map((v) => v.match(/https?:\/\/[^\s'"]+/)?.[0])
    .filter((url): url is string => !!url)
    .map((url) => new URL(url).origin);
  return [...new Set(origins)];
}

/** Collects the per-widget rows into test-results/render-matrix.md */
export default async function globalTeardown() {
  const files = await readdir(MATRIX_DIR).catch(() => []);
  const rows = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(resolve(MATRIX_DIR, f), "utf-8")))
  );
  if (rows.length === 0) return;

  rows.sort((a, b) => a.tool.localeCompare(b.tool));
  const count = (status: string) => rows.filter((r) => r.status === status).length;
  const escape = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 300);

  const lines = [
    `# Widget render matrix`,
    ``,
    `${rows.length} widgets: ${count("works")} works, ${count("partial")} partial, ${count("broken")} broken`,
    ``,
    `| Tool | Args | Status | Problems | Blocked by CSP |`,
    `|---|---|---|---|---|`,
    ...rows.map(
      (r) =>
        `| \`${r.tool}\` | ${Object.values(r.args).join(", ")} | ${r.status} | ${escape(r.problems.join("; "))} | ${escape(blockedOrigins(r.cspViolations).join(", "))} |`
    ),
  ];
  await writeFile(resolve(MATRIX_DIR, "../render-matrix.md"), lines.join("\n") + "\n");
  console.log(`\nRender matrix: test-results/render-matrix.md`);
}
