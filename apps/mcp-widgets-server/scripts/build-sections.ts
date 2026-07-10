/**
 * Build all section-based MCP widget bundles for a given entity.
 *
 * Usage:
 *   yarn build:widgets:target    # builds all target section widgets
 *   yarn build:widgets:drug      # builds all drug section widgets
 *   yarn build:widgets:evidence  # builds all evidence section widgets
 *   yarn build:widgets:all       # builds everything (existing + sections)
 *
 * Bundles are emitted to dist/widgets/ (same directory as the manual widgets).
 * The first section widget of each run clears the directory; subsequent ones append.
 * Pass --no-clean to skip cleaning (useful when building multiple entities sequentially).
 */
import { build } from "vite";
import { SECTION_REGISTRY } from "../src/sections/registry.js";
import { createSectionWidgetConfig } from "../vite/section-widget.plugin.js";

const entity = process.argv[2];
const noClean = process.argv.includes("--no-clean");

if (!entity || entity === "--help") {
  console.log("Usage: tsx scripts/build-sections.ts <entity|all> [--no-clean]");
  console.log("  entity: target | disease | drug | evidence | credibleSet | variant | study | all");
  process.exit(entity ? 0 : 1);
}

const sections =
  entity === "all"
    ? SECTION_REGISTRY
    : SECTION_REGISTRY.filter(s => s.entity === entity);

if (sections.length === 0) {
  console.error(`No sections found for entity: ${entity}`);
  process.exit(1);
}

console.log(`Building ${sections.length} ${entity} widget${sections.length > 1 ? "s" : ""}…`);

for (let i = 0; i < sections.length; i++) {
  const def = sections[i];
  const emptyOutDir = i === 0 && !noClean;
  console.log(`  [${i + 1}/${sections.length}] ${def.toolName}`);
  await build({
    ...createSectionWidgetConfig(def, { emptyOutDir }),
    logLevel: "warn",
  });
}

console.log("Done.");
