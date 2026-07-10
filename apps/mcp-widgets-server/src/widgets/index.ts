import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WidgetDef } from "./types.js";
import { SECTION_REGISTRY, type SectionDef } from "../sections/registry.js";

/** Converts a section path to a kebab-case ID used for bundle filenames and URIs. */
export function sectionPathToId(sectionPath: string): string {
  return sectionPath.replaceAll("/", "-").toLowerCase();
}

// Re-export for consumers
export type { WidgetDef } from "./types.js";
export { molecularStructureWidget } from "./molecular-structure.js";

import { molecularStructureWidget } from "./molecular-structure.js";

/** Manually-configured widgets with custom prefetch logic */
const MANUAL_WIDGETS: WidgetDef[] = [molecularStructureWidget];

// Resolve sections source root relative to this file (4 levels up from src/widgets/)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SECTIONS_SRC = resolve(__dirname, "../../../../packages/sections/src");

/** Auto-detects and reads the primary GQL query file for a section. */
function loadSectionQuery(sectionPath: string): { query: string; operationName: string } {
  const sectionName = sectionPath.split("/").pop()!;
  const dir = resolve(SECTIONS_SRC, sectionPath);
  const files = readdirSync(dir);

  // Preference order: {Name}Query.gql → {Name}.gql → sectionQuery.gql → any non-summary .gql
  const candidates = [
    `${sectionName}Query.gql`,
    `${sectionName}.gql`,
    "sectionQuery.gql",
    ...files.filter(
      f =>
        f.endsWith(".gql") &&
        !f.toLowerCase().includes("summary") &&
        !f.toLowerCase().includes("fragment")
    ),
  ];

  for (const candidate of candidates) {
    const filePath = resolve(dir, candidate);
    if (existsSync(filePath)) {
      const query = readFileSync(filePath, "utf-8");
      const match = query.match(/query\s+(\w+)/);
      const operationName = match?.[1] ?? sectionName + "Query";
      return { query, operationName };
    }
  }

  throw new Error(`[mcp] No query file found for section: ${sectionPath}`);
}

/** Derives a WidgetDef from a SectionDef registry entry. */
function deriveSectionWidgetDef(def: SectionDef): WidgetDef {
  // If primaryPrefetch is provided, use it; otherwise auto-detect from .gql file
  const prefetchBase = def.primaryPrefetch ?? (() => {
    const { query, operationName } = loadSectionQuery(def.sectionPath);
    return { query, operationName };
  })();

  const sectionId = sectionPathToId(def.sectionPath);
  const sectionName = def.sectionPath.split("/").pop()!;

  // Convert PascalCase to readable: "CancerHallmarks" → "Cancer Hallmarks"
  const readableName = sectionName.replace(/([A-Z])/g, " $1").trim();

  return {
    toolName: def.toolName,
    description: def.description,
    inputParam: def.inputParams[0] as { name: string; description: string },
    inputParams: def.inputParams as Array<{ name: string; description: string }>,
    uriPrefix: `ui://ot-mcp/${sectionId}`,
    bundleFile: `${sectionId}.js`,
    title: `${readableName} Widget`,
    successMessage: `${readableName} widget rendered successfully in the chat interface.`,
    prefetch: {
      operationName: prefetchBase.operationName,
      query: prefetchBase.query,
      extraVariables: def.prefetchExtraVariables,
      extraPrefetches: def.extraPrefetches,
    },
  };
}

/** Derived widgets from SECTION_REGISTRY (auto-detected GQL, standard Body delegation) */
const SECTION_WIDGETS: WidgetDef[] = SECTION_REGISTRY.flatMap(def => {
  try {
    return [deriveSectionWidgetDef(def)];
  } catch (err) {
    console.warn(`[mcp] Skipping section widget ${def.toolName}:`, (err as Error).message);
    return [];
  }
});

/** All registered widget tools — MCP server, chat handler, and /status all read from this. */
export const WIDGET_REGISTRY: WidgetDef[] = [...MANUAL_WIDGETS, ...SECTION_WIDGETS];
