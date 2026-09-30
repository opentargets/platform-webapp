import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAlignLeft,
  faBookmark,
  faChartColumn,
  faCircleInfo,
  faCode,
  faGlobe,
  faHeading,
  faImage,
  faMinus,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import type { Report } from "../../../core";
import { isWidget } from "../../../core";
import type { ExportWarning, FigureAsset, IRNode } from "../types";
import { toPlainText } from "../richText/toPlainText";
import { renderRichTextHTML } from "../../blocks/richText";
import type { RichTextDoc } from "../../../core";

const SNIPPET_LENGTH = 70;

const snippet = (text: string) =>
  text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH - 1).trimEnd()}…` : text;

/** Short title for a node in the step-2 role list. */
export const nodeTitle = (node: IRNode): string => {
  switch (node.type) {
    case "chapter":
      return node.title || "Chapter";
    case "heading":
      return node.text || "Heading";
    case "prose": {
      const text = toPlainText(node.doc).replace(/\s+/g, " ").trim();
      return snippet(text) || (node.tone ? "Callout" : "Text");
    }
    case "divider":
      return "Divider";
    default:
      return node.title || node.type;
  }
};

export const nodeIcon = (node: IRNode): IconDefinition => {
  switch (node.type) {
    case "chapter":
      return faBookmark;
    case "heading":
      return faHeading;
    case "prose":
      return node.tone ? faCircleInfo : faAlignLeft;
    case "divider":
      return faMinus;
    case "dataSource":
      return node.source === "rest" ? faGlobe : faCode;
    case "table":
      return node.source === "widget" ? faChartColumn : faTable;
    case "figure":
      return node.source === "image" ? faImage : faChartColumn;
  }
};

/** Widget short name (e.g. "KD") for the avatar, like ReportSectionRow. */
export const widgetAvatarText = (report: Report, nodeId: string): string | undefined => {
  const section = report.sections.find((s) => s.reportSectionId === nodeId);
  if (!section || !isWidget(section)) return undefined;
  return section.definition.shortName || section.definition.name.charAt(0);
};

/** Warnings a node needs a human to look at (severity "warn"). */
export const flaggedNodeIds = (warnings: ExportWarning[]): string[] => {
  const ids: string[] = [];
  warnings.forEach((w) => {
    if (w.severity === "warn" && w.nodeId && !ids.includes(w.nodeId)) ids.push(w.nodeId);
  });
  return ids;
};

export const rowDomId = (nodeId: string) => `export-role-row-${nodeId}`;

// ---------- preview caches (assets and docs are immutable within a dialog session) ----------

const assetSrcCache = new WeakMap<object, string>();

/** <img> src for an svg/raster asset; svg goes through a data URL, never injected as markup. */
export const assetSrc = (asset: FigureAsset): string | undefined => {
  if (asset.kind === "missing") return undefined;
  const cached = assetSrcCache.get(asset);
  if (cached) return cached;
  const src =
    asset.kind === "svg"
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`
      : asset.dataUrl;
  assetSrcCache.set(asset, src);
  return src;
};

const htmlCache = new WeakMap<object, string>();

/** Schema-sanitised HTML for a rich-text doc (same renderer as the drawer). */
export const docHtml = (doc: RichTextDoc): string => {
  const cached = htmlCache.get(doc);
  if (cached !== undefined) return cached;
  let html = "";
  try {
    html = renderRichTextHTML(doc);
  } catch {
    html = "";
  }
  htmlCache.set(doc, html);
  return html;
};

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
