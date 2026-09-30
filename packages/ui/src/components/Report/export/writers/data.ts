import type { Report, ReportBlock, ReportSection } from "../../../../types/report";
import { isWidget } from "../../../../types/report";
import { figureLabel, tableLabel } from "../../blocks/figures";
import { inferColumnKeys, resolveRows } from "../../blocks/dataPaths";
import { toMarkdown } from "../richText/toMarkdown";
import type { ExportDocument, ExportSettings, IRNode, TableData } from "../types";

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const escapeCsv = (s: string): string => (/[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** RFC 4180 CSV: header of column labels, CRLF line ends, fields quoted where needed. */
export function toCsv(data: TableData): string {
  const header = data.columns.map((c) => escapeCsv(c.label || c.key)).join(",");
  const rows = data.rows.map((row) => data.columns.map((c) => escapeCsv(cellText(row[c.key]))).join(","));
  return `${[header, ...rows].join("\r\n")}\r\n`;
}

export const fileSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "table";

export const uniqueName = (taken: Set<string>, stem: string, ext: string): string => {
  let name = `${stem}.${ext}`;
  for (let n = 2; taken.has(name); n += 1) name = `${stem}-${n}.${ext}`;
  taken.add(name);
  return name;
};

const rowsToTable = (rows: Record<string, unknown>[]): TableData => ({
  columns: inferColumnKeys(rows, rows.length).map((key) => ({ key, label: key })),
  rows,
  totalRows: rows.length,
});

const blockTitle = (block: ReportBlock): string => {
  if (isWidget(block)) return block.definition.name;
  if ("title" in block && block.title) return block.title;
  if (block.kind === "image") return block.caption || block.fileName || "Image";
  if (block.kind === "heading") return block.text || "Heading";
  return block.kind;
};

type HtmlRenderer = (doc: unknown) => string;

const loadHtmlRenderer = async (): Promise<HtmlRenderer | null> => {
  try {
    const mod = await import("../../blocks/richText");
    return (doc) => mod.renderRichTextHTML(doc as never);
  } catch {
    return null;
  }
};

const loadLiveResult = async (): Promise<((id: string) => unknown) | null> => {
  try {
    const mod = await import("../../blocks/dataResultsStore");
    return (id) => {
      const result = mod.dataResultsStore.get(id);
      return result?.status === "success" ? result.data : undefined;
    };
  } catch {
    return null;
  }
};

/** Same semantics as serializeBlock (report-core): secret header values blanked. */
const serializeForExport = (
  block: ReportBlock,
  report: Report,
  settings: ExportSettings,
  html: HtmlRenderer | null
): Record<string, unknown> => {
  if (isWidget(block)) {
    const section = block as ReportSection;
    return {
      ...section,
      kind: "widget",
      name: section.definition.name,
      entity: section.definition.entity,
    };
  }
  switch (block.kind) {
    case "rest":
      return { ...block, headers: block.headers.map((h) => (h.secret ? { ...h, value: "" } : h)) };
    case "image": {
      const { src, ...rest } = block;
      return {
        ...(settings.includeImages ? block : rest),
        label: figureLabel(report.sections, block.reportSectionId),
      };
    }
    case "table":
      return { ...block, label: tableLabel(report.sections, block.reportSectionId) };
    case "text":
    case "callout": {
      const out: Record<string, unknown> = { ...block, markdown: toMarkdown(block.doc) };
      if (html) {
        try {
          out.html = html(block.doc);
        } catch {
          // generateHTML needs a DOM; markdown is still there
        }
      }
      return out;
    }
    default:
      return { ...block };
  }
};

const nodeTable = (node: IRNode | undefined): TableData | undefined => {
  if (!node) return undefined;
  if (node.type === "table") return node.data;
  if (node.type === "figure") return node.tableData;
  if (node.type === "dataSource") return node.data;
  return undefined;
};

/**
 * Data & provenance zip: report.json (secrets stripped, images only with includeImages,
 * IR provenance when `doc` is given) plus one CSV per table / data block / widget table.
 */
export async function writeData(report: Report, doc: ExportDocument | null, settings: ExportSettings): Promise<Blob> {
  const { zipSync, strToU8 } = await import("fflate");
  const [html, live] = await Promise.all([loadHtmlRenderer(), loadLiveResult()]);
  const nodes = new Map<string, IRNode>((doc?.nodes ?? []).map((n) => [n.id, n]));
  const files: Record<string, Uint8Array> = {};
  const taken = new Set<string>(["report.json"]);
  const csvFiles: { reportSectionId: string; title: string; file: string; rows: number; totalRows: number }[] = [];

  const addCsv = (block: ReportBlock, data: TableData | undefined) => {
    if (!data || data.columns.length === 0) return undefined;
    const title = blockTitle(block);
    const file = `tables/${uniqueName(taken, fileSlug(title), "csv")}`;
    files[file] = strToU8(toCsv(data));
    csvFiles.push({
      reportSectionId: block.reportSectionId,
      title,
      file,
      rows: data.rows.length,
      totalRows: Math.max(data.totalRows, data.rows.length),
    });
    return file;
  };

  const sections = report.sections.map((block) => {
    const out = serializeForExport(block, report, settings, html);
    const node = nodes.get(block.reportSectionId);
    let data: TableData | undefined;
    if (block.kind === "table") {
      data = { columns: block.columns.map(({ key, label }) => ({ key, label })), rows: block.rows, totalRows: block.rows.length };
    } else if (block.kind === "graphql" || block.kind === "rest") {
      data = nodeTable(node);
      if (!data) {
        const source = live?.(block.reportSectionId) ?? block.snapshot?.data;
        const rows = source !== undefined ? resolveRows(source, block.rowsPath).rows : null;
        if (rows) data = rowsToTable(rows);
      }
    } else if (isWidget(block)) {
      data = nodeTable(node);
    }
    const csv = addCsv(block, data);
    if (csv) out.csv = csv;
    if (node && "provenance" in node) out.provenance = node.provenance;
    if (node) out.irType = node.type;
    return out;
  });

  const json = {
    format: "open-targets-report-export",
    version: 1,
    generatedAt: doc?.generatedAt ?? Date.now(),
    dataRelease: doc?.dataRelease,
    report: {
      id: report.id,
      name: report.name,
      description: report.description,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      entityContext: report.entityContext,
      entity: doc?.entity,
      sections,
    },
    references: doc?.references ?? [],
    warnings: doc?.warnings ?? [],
    files: csvFiles,
  };
  files["report.json"] = strToU8(JSON.stringify(json, null, 2));
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: "application/zip" });
}
