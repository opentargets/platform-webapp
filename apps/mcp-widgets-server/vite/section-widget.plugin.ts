/**
 * Vite plugin and config factory for section-based MCP widgets.
 *
 * Instead of per-widget main.tsx files, this generates the widget entry point
 * and writes it to a temp file that Vite can use as a lib entry.
 *
 * Usage in the build script (iterates all sections for an entity):
 *   await build(createSectionWidgetConfig(def, { emptyOutDir: i === 0 }))
 */
import { resolve } from "path";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import type { UserConfig } from "vite";
import {
  ROOT,
  createWidgetBuildConfig,
  createUiBarrelStub,
  createPlatformStubsPlugin,
} from "./widget.config.base";
import type { SectionDef } from "../src/sections/registry";
import { sectionPathToId } from "../src/widgets/index.js";

/** Generates the IIFE entry code for a section widget. */
function generateEntryCode(def: SectionDef): string {
  const paramNames = def.inputParams.map(p => p.name);
  const isEvidence = def.entity === "evidence";

  const extractChecks = paramNames
    .map(n => `typeof args[${JSON.stringify(n)}] === "string"`)
    .join(" && ");
  const extractReturn =
    "{ " + paramNames.map(n => `${JSON.stringify(n)}: args[${JSON.stringify(n)}]`).join(", ") + " }";

  const bodyId = isEvidence
    ? `{ ensgId: props[${JSON.stringify(paramNames[0])}], efoId: props[${JSON.stringify(paramNames[1])}] }`
    : `props[${JSON.stringify(paramNames[0])}]`;
  const bodyLabel = `props[${JSON.stringify(paramNames[0])}]`;

  const sectionId = sectionPathToId(def.sectionPath);

  return `
import React from "react";
import Body from "@ot/sections/${def.sectionPath}/Body";
import { mountWidget } from "@widget-shared/createWidgetEntry";

mountWidget({
  appName: ${JSON.stringify("ot-section-" + sectionId)},
  cacheKey: ${JSON.stringify("ot-" + sectionId)},
  extractArgs: function(args) {
    if (!args) return null;
    if (!(${extractChecks})) return null;
    return ${extractReturn};
  },
  component: function WidgetBody(props) {
    return React.createElement(Body, {
      id: ${bodyId},
      label: ${bodyLabel},
      entity: ${JSON.stringify(def.entity === "evidence" ? "disease" : def.entity)}
    });
  }
});
`.trim();
}

/** Writes entry code to a temp .tsx file and returns the path. */
function writeTempEntry(def: SectionDef): string {
  const sectionId = sectionPathToId(def.sectionPath);
  const dir = resolve(tmpdir(), "ot-mcp-section-entries");
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, `${sectionId}.tsx`);
  writeFileSync(filePath, generateEntryCode(def), "utf-8");
  return filePath;
}

/** Creates a complete Vite build config for one section widget. */
export function createSectionWidgetConfig(
  def: SectionDef,
  opts?: { emptyOutDir?: boolean }
): UserConfig {
  const sectionId = sectionPathToId(def.sectionPath);
  const entryPath = writeTempEntry(def);

  // PascalCase IIFE global name: "target-tractability" -> "OtTargetTractabilityWidget"
  const iifeName =
    "Ot" +
    sectionId
      .split("-")
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join("") +
    "Widget";

  return createWidgetBuildConfig({
    entry: entryPath,
    outputName: iifeName,
    outputFile: `${sectionId}.js`,
    emptyOutDir: opts?.emptyOutDir ?? false,
    plugins: [createUiBarrelStub(), createPlatformStubsPlugin()],
  });
}
