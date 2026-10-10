import { type ExportBranding, releaseLabel } from "../../../core";
import type { DataSourceRequest, IRNode, MethodsEntry, Provenance, TableData } from "../types";

export type FigureNode = Extract<IRNode, { type: "figure" }>;
export type TableNode = Extract<IRNode, { type: "table" }>;
export type DataSourceNode = Extract<IRNode, { type: "dataSource" }>;

export const safeRequest = (request: DataSourceRequest): DataSourceRequest =>
  request.headers
    ? { ...request, headers: request.headers.map((h) => (h.secret ? { ...h, value: "" } : h)) }
    : request;

// User uploads and arbitrary REST hosts aren't the platform's data, so they don't inherit the release
const isExternal = (source: string): boolean => source === "image" || source === "table" || source === "rest";

const methodsKind = (node: FigureNode | TableNode | DataSourceNode): MethodsEntry["kind"] => {
  if (node.type === "dataSource") return node.source;
  if (node.source === "image") return "image";
  if (node.source === "table") return "table";
  if (node.source === "notebook") return "notebook";
  return "widget";
};

export function methodsEntry(
  node: FigureNode | TableNode | DataSourceNode,
  dataRelease: string | undefined,
  figureLabel?: string
): MethodsEntry {
  const p = node.provenance;
  const notes: string[] = [];
  let request: DataSourceRequest | undefined;
  if (node.type === "dataSource") {
    request = safeRequest(node.request);
    if (node.request.headers?.some((h) => h.secret)) notes.push("Secret header values omitted");
    if (node.stale) notes.push("Snapshot predates the current data release");
    if (!node.data) notes.push("No result or snapshot; data omitted");
  }
  if (node.type === "figure" && node.rasterFallback) notes.push("Image only, not re-rendered");
  if (node.type === "figure" && node.asset.kind === "missing") notes.push("Figure could not be rendered");
  const external = isExternal(node.source);
  const notebook = node.type !== "dataSource" ? node.notebook : undefined;
  return {
    nodeId: node.id,
    title: node.title,
    kind: methodsKind(node),
    sourceLabel: p.sourceLabel,
    request,
    code: notebook?.code,
    inputRefs: notebook?.inputs,
    filters: p.filters ?? [],
    entity: p.entity,
    dataRelease: external ? p.dataRelease : p.dataRelease ?? dataRelease,
    retrievedAt: p.retrievedAt,
    deepLink: p.deepLink,
    figureLabel,
    note: notes.length ? notes.join("; ") : undefined,
  };
}

/** Rows [from, to) of a table, keeping the full row count. */
export const sliceTable = (data: TableData, from: number, to: number): TableData => ({
  columns: data.columns,
  rows: data.rows.slice(from, to),
  totalRows: Math.max(data.totalRows, data.rows.length),
});

export const totalRowsOf = (data: TableData): number => Math.max(data.totalRows, data.rows.length);

const sentence = (s: string | undefined): string => {
  const t = (s ?? "").trim();
  if (!t) return "";
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

/** "takeaway. caption. Filters: a, b. Source: sourceLabel · Open Targets {release}." */
export function buildCaption(
  node: { takeaway?: string; caption?: string; source: string; provenance: Provenance },
  dataRelease: string | undefined,
  branding: Pick<ExportBranding, "organisation" | "platform">
): string {
  const p = node.provenance;
  const external = isExternal(node.source);
  const release = external ? p.dataRelease : p.dataRelease ?? dataRelease;
  const source = [p.sourceLabel, release ? releaseLabel(branding, release) : undefined].filter(Boolean).join(" · ");
  return [
    sentence(node.takeaway),
    node.caption && node.caption.trim() !== node.takeaway?.trim() ? sentence(node.caption) : "",
    p.filters?.length ? sentence(`Filters: ${p.filters.join(", ")}`) : "",
    source ? sentence(`Source: ${source}`) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
