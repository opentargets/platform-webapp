import { DEFAULT_TOP_N, PAPER_MAX_TABLE } from "../layout";
import type {
  BlockExportOverride,
  ExportPlan,
  ExportSettings,
  IRNode,
  PaperRole,
  SlideRole,
  TableLayout,
} from "../types";

export type EffectiveRole = ExportPlan["roles"][string];

/**
 * Role conventions for structural nodes (they have no dedicated role in the contract):
 * - slides: chapter "statement" = divider slide, "omit" = no divider (still starts a title group);
 *   heading "notes" = kicker above the next figure slide.
 * - paper: chapter/heading/prose "body" = in the flow.
 */
export function validSlideRoles(node: IRNode): SlideRole[] {
  switch (node.type) {
    case "chapter":
      return ["statement", "omit"];
    case "heading":
      return ["notes", "omit"];
    case "prose":
      return ["notes", "statement", "omit"];
    case "divider":
      return ["omit"];
    case "figure":
      return ["figure", "fullBleed", "omit"];
    case "table":
      return ["figure", "appendix", "omit"];
    case "dataSource":
      return ["appendix", "omit"];
  }
}

export function validPaperRoles(node: IRNode): PaperRole[] {
  switch (node.type) {
    case "chapter":
    case "heading":
    case "prose":
      return ["body", "omit"];
    case "divider":
      return ["omit"];
    case "figure":
      return ["figure", "omit"];
    case "table":
      return ["table", "supplementary", "omit"];
    case "dataSource":
      return node.data ? ["methods", "supplementary", "omit"] : ["methods", "omit"];
  }
}

export function validTableLayouts(node: IRNode): TableLayout[] {
  return node.type === "table" ? ["topN", "split", "appendix", "omit"] : [];
}

export const tableExceedsPaper = (node: IRNode): boolean =>
  node.type === "table" &&
  (node.data.columns.length > PAPER_MAX_TABLE.cols ||
    Math.max(node.data.rows.length, node.data.totalRows) > PAPER_MAX_TABLE.rows);

export function defaultSlideRole(node: IRNode, settings: ExportSettings): SlideRole {
  switch (node.type) {
    case "chapter":
      return settings.slides.chapterDividers ? "statement" : "omit";
    case "heading":
      return "notes";
    case "prose":
      return node.tone === "finding" ? "statement" : "notes";
    case "divider":
      return "omit";
    case "figure":
      return node.source === "notebook" ? "fullBleed" : "figure";
    case "table":
      return "figure";
    case "dataSource":
      return node.feedsOtherBlocks ? "omit" : "appendix";
  }
}

export function defaultPaperRole(node: IRNode): PaperRole {
  switch (node.type) {
    case "chapter":
    case "heading":
    case "prose":
      return "body";
    case "divider":
      return "omit";
    case "figure":
      return "figure";
    case "table":
      return tableExceedsPaper(node) ? "supplementary" : "table";
    case "dataSource":
      return "methods";
  }
}

export const nodeOverride = (
  settings: ExportSettings,
  nodeId: string,
  target: "slides" | "paper"
): BlockExportOverride => settings.overrides?.[nodeId]?.[target] ?? {};

/** Defaults per IR type, then per-block overrides (ignored when not valid for the node). */
export function effectiveRole(node: IRNode, target: "slides" | "paper", settings: ExportSettings): EffectiveRole {
  const override = nodeOverride(settings, node.id, target);
  if (target === "paper") {
    const valid = validPaperRoles(node);
    const role = override.role && valid.includes(override.role as PaperRole) ? override.role : defaultPaperRole(node);
    return { role };
  }
  const valid = validSlideRoles(node);
  let role: SlideRole =
    override.role && valid.includes(override.role as SlideRole) ? (override.role as SlideRole) : defaultSlideRole(node, settings);
  if (node.type !== "table") return { role };
  let tableLayout: TableLayout =
    override.tableLayout && validTableLayouts(node).includes(override.tableLayout) ? override.tableLayout : "topN";
  if (tableLayout === "omit") role = "omit";
  if (role === "omit") tableLayout = "omit";
  // The whole table lives in the appendix, so main-slide layout rules (top N, width) don't apply
  if (role === "appendix") tableLayout = "appendix";
  const topN = override.topN && override.topN > 0 ? Math.floor(override.topN) : DEFAULT_TOP_N;
  return { role, tableLayout, topN };
}

const kindLabel = (node: IRNode): string => {
  switch (node.type) {
    case "prose":
      return node.tone ? "callout" : "text";
    case "figure":
    case "table":
    case "dataSource":
      return node.source;
    default:
      return node.type;
  }
};

const slideRoleText = (node: IRNode, role: SlideRole, tableLayout?: TableLayout, topN?: number): string => {
  if (role === "omit") return node.type === "chapter" ? "title group (no divider)" : "omitted";
  if (node.type === "chapter") return "divider slide";
  if (node.type === "heading") return "kicker";
  if (node.type === "table") {
    if (role === "appendix") return "appendix slide";
    if (tableLayout === "split") return "figure slide · split to appendix";
    if (tableLayout === "appendix") return "figure slide · table in appendix";
    return `figure slide · top ${topN ?? DEFAULT_TOP_N}`;
  }
  switch (role) {
    case "figure":
      return "figure slide";
    case "fullBleed":
      return "full-bleed slide";
    case "statement":
      return "statement slide";
    case "notes":
      return "speaker notes";
    case "appendix":
      return "appendix slide";
  }
};

const paperRoleText = (node: IRNode, role: PaperRole): string => {
  if (role === "omit") return "omitted";
  if (node.type === "chapter") return "section heading";
  if (node.type === "heading") return "sub-heading";
  if (node.type === "prose") return node.tone ? "boxed paragraph" : "body text";
  switch (role) {
    case "figure":
      return "figure";
    case "table":
      return "table";
    case "supplementary":
      return "supplementary table";
    case "methods":
      return "methods entry";
    default:
      return "body text";
  }
};

/** Mono role line for step 2, e.g. "widget → figure slide", "table → figure slide · top 10". */
export function roleLabel(
  target: "slides" | "paper",
  node: IRNode,
  role: SlideRole | PaperRole,
  tableLayout?: TableLayout,
  topN?: number
): string {
  const text =
    target === "slides"
      ? slideRoleText(node, role as SlideRole, tableLayout, topN)
      : paperRoleText(node, role as PaperRole);
  return `${kindLabel(node)} → ${text}`;
}
