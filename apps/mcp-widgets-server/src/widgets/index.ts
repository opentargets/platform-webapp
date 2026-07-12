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

/** Manually-configured widgets */
const MANUAL_WIDGETS: WidgetDef[] = [molecularStructureWidget];

/** Derives a WidgetDef from a SectionDef registry entry. */
function deriveSectionWidgetDef(def: SectionDef): WidgetDef {
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
    extraConnectDomains: def.extraConnectDomains,
  };
}

/** Derived widgets from SECTION_REGISTRY (standard Body delegation) */
const SECTION_WIDGETS: WidgetDef[] = SECTION_REGISTRY.map(deriveSectionWidgetDef);

/** All registered widget tools — MCP server, chat handler, and /status all read from this. */
export const WIDGET_REGISTRY: WidgetDef[] = [...MANUAL_WIDGETS, ...SECTION_WIDGETS];
