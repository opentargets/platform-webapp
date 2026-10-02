import { PAPER_MAX_TABLE, SLIDE_GEOMETRY } from "../layout";
import type { ExportDocument, ExportPlan, ExportSettings, ExportWarning, IRNode } from "../types";

const warningKey = (w: ExportWarning) => `${w.code}|${w.nodeId ?? ""}|${w.message}`;

/** Collects warnings for one plan run; dedupes and fills in the standard one-click fixes. */
export class WarningSink {
  private list: ExportWarning[] = [];
  private keys = new Set<string>();

  add(warning: ExportWarning): void {
    const w = withStandardFix(warning);
    const key = warningKey(w);
    if (this.keys.has(key)) return;
    this.keys.add(key);
    this.list.push(w);
  }

  has(code: ExportWarning["code"], nodeId?: string): boolean {
    return this.list.some((w) => w.code === code && w.nodeId === nodeId);
  }

  /** Drops warnings on omitted nodes (the user has dealt with them), warnings first, then info. */
  result(roles: ExportPlan["roles"]): ExportWarning[] {
    const kept = this.list.filter((w) => !w.nodeId || roles[w.nodeId]?.role !== "omit");
    return [...kept.filter((w) => w.severity === "warn"), ...kept.filter((w) => w.severity !== "warn")];
  }
}

const withStandardFix = (w: ExportWarning): ExportWarning => {
  if (w.fix) return w;
  if (w.code === "FIGURE_MISSING") return { ...w, fix: { label: "Omit", override: { role: "omit" } } };
  if (w.code === "TABLE_TOO_WIDE") return { ...w, fix: { label: "Move to appendix", override: { tableLayout: "appendix" } } };
  return w;
};

/** Warnings the plan derives from the IR alone, for both targets (collection warnings are merged as-is). */
export function nodeWarnings(sink: WarningSink, doc: ExportDocument): void {
  doc.warnings.forEach((w) => sink.add(w));
  doc.nodes.forEach((node) => {
    if (node.type === "figure") {
      if (node.asset.kind === "missing" && !sink.has("FIGURE_MISSING", node.id)) {
        sink.add({
          nodeId: node.id,
          severity: "warn",
          code: "FIGURE_MISSING",
          message: `“${node.title}” could not be rendered (${node.asset.reason}); a titled placeholder will be exported.`,
        });
      }
      if (node.rasterFallback && !sink.has("RASTER_FALLBACK", node.id)) {
        sink.add({ nodeId: node.id, severity: "info", code: "RASTER_FALLBACK", message: "Image only, not re-rendered." });
      }
    }
    if (node.type === "dataSource" && node.request.headers?.some((h) => h.secret)) {
      if (!sink.has("SECRET_HEADERS_OMITTED", node.id)) {
        sink.add({
          nodeId: node.id,
          severity: "info",
          code: "SECRET_HEADERS_OMITTED",
          message: `Secret header values of “${node.title}” are omitted from the export.`,
        });
      }
    }
  });
}

export const tableRowCount = (node: IRNodeTable): number => Math.max(node.data.rows.length, node.data.totalRows);

type IRNodeTable = Extract<IRNode, { type: "table" }>;

export function slideTableWarnings(
  sink: WarningSink,
  node: IRNodeTable,
  settings: ExportSettings,
  layout: string | undefined,
  topN: number
): void {
  const maxCols = SLIDE_GEOMETRY[settings.slides.aspect].maxTableCols;
  const cols = node.data.columns.length;
  const rows = tableRowCount(node);
  if (cols > maxCols && layout !== "appendix" && layout !== "omit") {
    sink.add({
      nodeId: node.id,
      severity: "warn",
      code: "TABLE_TOO_WIDE",
      message: `${cols} columns won't fit a ${settings.slides.aspect} slide (max ${maxCols}).`,
    });
  }
  if (layout === "topN" && rows > topN) {
    sink.add({
      nodeId: node.id,
      severity: "warn",
      code: "TABLE_TOO_LONG",
      message: `Showing ${topN} of ${rows} rows; the rest are not exported.`,
      fix: { label: "Split to appendix", override: { tableLayout: "split" } },
    });
  }
}

export function paperTableWarnings(sink: WarningSink, node: IRNodeTable, role: string, isDefault: boolean): void {
  const cols = node.data.columns.length;
  const rows = tableRowCount(node);
  if (cols <= PAPER_MAX_TABLE.cols && rows <= PAPER_MAX_TABLE.rows) return;
  const size = `${rows} rows × ${cols} columns`;
  if (role === "table") {
    sink.add({
      nodeId: node.id,
      severity: "warn",
      code: "TABLE_TOO_LONG",
      message: `${size} is too large to place inline (max ${PAPER_MAX_TABLE.rows} × ${PAPER_MAX_TABLE.cols}).`,
      fix: { label: "Move to supplementary", override: { role: "supplementary" } },
    });
  } else if (role === "supplementary" && isDefault) {
    sink.add({
      nodeId: node.id,
      severity: "info",
      code: "TABLE_TOO_LONG",
      message: `${size}: moved to the supplementary tables.`,
    });
  }
}
