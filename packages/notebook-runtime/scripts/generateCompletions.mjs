// Generates the static d3 / Plot member lists used by the notebook editor's
// autocomplete, from the pinned versions bundled into the runtime.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../ui/src/components/Report/blocks/notebook/completions");
mkdirSync(outDir, { recursive: true });

const d3 = await import("d3");
const Plot = await import("@observablehq/plot");

const members = (mod) =>
  Object.keys(mod)
    .filter((k) => k !== "default" && !k.startsWith("_"))
    .sort()
    .map((name) => ({ name, type: typeof mod[name] === "function" ? "function" : "variable" }));

writeFileSync(resolve(outDir, "d3.json"), JSON.stringify(members(d3)));
writeFileSync(resolve(outDir, "plot.json"), JSON.stringify(members(Plot)));
console.log(`d3: ${members(d3).length} members, Plot: ${members(Plot).length} members → ${outDir}`);
