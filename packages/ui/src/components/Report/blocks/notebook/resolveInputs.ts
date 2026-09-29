import {
  isDataBlock,
  isNotebook,
  isWidget,
  refOf,
  type NotebookBlock,
  type ReportBlock,
  type ReportSection,
  type TableBlock,
} from "../../../../types/report";
import { getSectionExportAdapter } from "../../../../providers/SectionRegistry";
import type { TableData } from "../../export/types";
import { formatComponentState } from "../../CapturedStateChips";
import { dataResultsStore } from "../dataResultsStore";
import { detectArrayPaths, getAtPath, resolveRows } from "../dataPaths";
import { notebookResultsStore } from "./notebookResultsStore";
import type { NotebookColumn } from "./protocol";

export type InputStatus =
  | "ok"
  | "missing" // no block has this ref any more
  | "noAdapter" // widget without an export adapter and no detectable rows
  | "chartOnly" // upstream notebook returned a DOM node
  | "notRun" // data block / notebook with no live result or snapshot
  | "failed"; // data block / notebook whose last run errored

export interface ResolvedInput {
  ref: string;
  status: InputStatus;
  reason?: string;
  // What the sandbox variable is bound to (always structured-cloneable)
  value: unknown;
  // For chips and completions
  summary: {
    title: string;
    kind: "widget" | "table" | "graphql" | "rest" | "notebook";
    blockId?: string;
    rows: number;
    columns: NotebookColumn[];
  };
  // Cheap version stamp: changes whenever the input's data would
  version: string;
}

const SAMPLE_ROWS = 200;

const columnType = (values: unknown[]): NotebookColumn["type"] => {
  const present = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (present.length === 0) return "string";
  if (present.every((v) => typeof v === "number")) return "number";
  if (present.every((v) => typeof v === "boolean")) return "boolean";
  if (present.every((v) => v instanceof Date)) return "date";
  if (present.every((v) => typeof v === "object")) return "object";
  return "string";
};

/** `{ key, label, type }` per column, inferred from the first 200 rows unless declared. */
export const inferColumns = (
  rows: Record<string, unknown>[],
  declared?: { key: string; label?: string; type?: string }[]
): NotebookColumn[] => {
  const sample = rows.slice(0, SAMPLE_ROWS);
  const keys: string[] = declared ? declared.map((c) => c.key) : [];
  if (!declared) {
    const seen = new Set<string>();
    sample.forEach((row) => Object.keys(row).forEach((k) => seen.add(k)));
    keys.push(...seen);
  }
  return keys.map((key) => {
    const d = declared?.find((c) => c.key === key);
    const type = (d?.type as NotebookColumn["type"] | undefined) ?? columnType(sample.map((r) => r[key]));
    return { key, label: d?.label ?? key, type };
  });
};

// ---------- widgets ----------

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const named = (value as Record<string, unknown>).name ?? (value as Record<string, unknown>).id;
    return typeof named === "string" ? named : JSON.stringify(value);
  }
  return String(value);
};

/**
 * Best-effort application of OtTable's captured state (search, column filters,
 * sort) to generic rows, for widgets without an export adapter.
 */
const applyTableState = (rows: Record<string, unknown>[], state?: Record<string, any>): Record<string, unknown>[] => {
  if (!state) return rows;
  let out = rows;
  Object.values(state).forEach((bag) => {
    if (!isPlainObject(bag)) return;
    const { globalFilter, columnFilters, sorting } = bag as {
      globalFilter?: unknown;
      columnFilters?: { id: string; value: unknown }[];
      sorting?: { id: string; desc: boolean }[];
    };
    if (typeof globalFilter === "string" && globalFilter.trim()) {
      const q = globalFilter.trim().toLowerCase();
      out = out.filter((row) => Object.values(row).some((v) => cellText(v).toLowerCase().includes(q)));
    }
    if (Array.isArray(columnFilters)) {
      columnFilters.forEach(({ id, value }) => {
        if (value === undefined || value === null || value === "") return;
        const wanted = Array.isArray(value) ? value.map((v) => cellText(v).toLowerCase()) : null;
        const q = cellText(value).toLowerCase();
        out = out.filter((row) => {
          const cell = cellText(row[id]).toLowerCase();
          return wanted ? wanted.includes(cell) : cell.includes(q);
        });
      });
    }
    if (Array.isArray(sorting) && sorting.length) {
      const [{ id, desc }] = sorting;
      out = [...out].sort((a, b) => {
        const x = a[id];
        const y = b[id];
        const cmp =
          typeof x === "number" && typeof y === "number" ? x - y : cellText(x).localeCompare(cellText(y));
        return desc ? -cmp : cmp;
      });
    }
  });
  return out;
};

/** Generic adapter: the first array of objects in the captured response. */
const genericWidgetTable = (data: unknown): TableData | undefined => {
  const paths = detectArrayPaths(data);
  if (paths.length === 0) return undefined;
  const rows = getAtPath(data, paths[0]) as Record<string, unknown>[];
  const columns = inferColumns(rows);
  return { columns: columns.map((c) => ({ key: c.key, label: c.label })), rows, totalRows: rows.length };
};

const widgetTables = (
  section: ReportSection
): { rows: Record<string, unknown>[]; allRows: Record<string, unknown>[]; adapter: boolean } | null => {
  const data = section.request?.data;
  const adapter = getSectionExportAdapter(section.definition);
  if (adapter?.toTable) {
    try {
      const filtered = adapter.toTable(data, section.componentState);
      const all = adapter.toTable(data, undefined);
      if (filtered || all) {
        return { rows: filtered?.rows ?? all?.rows ?? [], allRows: all?.rows ?? filtered?.rows ?? [], adapter: true };
      }
    } catch {
      // fall through to the generic path
    }
  }
  const generic = genericWidgetTable(data);
  if (!generic) return null;
  return { rows: applyTableState(generic.rows, section.componentState), allRows: generic.rows, adapter: false };
};

const resolveWidget = (section: ReportSection, ref: string): ResolvedInput => {
  const title = section.definition.name;
  const meta = {
    kind: "widget" as const,
    title,
    entity: { type: section.definition.entity, id: section.entityId, label: section.entityLabel },
    filters: formatComponentState(section.componentState),
  };
  const tables = widgetTables(section);
  const version = String(section.stateCapturedAt ?? section.addedAt);
  if (!tables) {
    return {
      ref,
      status: "noAdapter",
      reason: "no data adapter",
      value: { rows: [], allRows: [], columns: [], meta },
      summary: { title, kind: "widget", blockId: section.reportSectionId, rows: 0, columns: [] },
      version,
    };
  }
  const columns = inferColumns(tables.allRows);
  return {
    ref,
    status: "ok",
    reason: tables.adapter ? undefined : "generic adapter: first table in the captured data",
    value: { rows: tables.rows, allRows: tables.allRows, columns, meta },
    summary: { title, kind: "widget", blockId: section.reportSectionId, rows: tables.rows.length, columns },
    version,
  };
};

// ---------- data blocks ----------

const resolveTable = (block: TableBlock, ref: string): ResolvedInput => {
  const columns = inferColumns(block.rows, block.columns);
  return {
    ref,
    status: "ok",
    value: {
      rows: block.rows,
      columns,
      meta: { kind: "table", title: block.title, fileName: block.source.fileName },
    },
    summary: { title: block.title, kind: "table", blockId: block.reportSectionId, rows: block.rows.length, columns },
    version: `${block.dataUpdatedAt ?? block.addedAt}:${block.rows.length}`,
  };
};

const resolveDataBlock = (block: Exclude<ReportBlock, ReportSection>, ref: string): ResolvedInput => {
  if (block.kind === "table") return resolveTable(block, ref);
  if (block.kind !== "graphql" && block.kind !== "rest") throw new Error("not a data block");
  const live = dataResultsStore.get(block.reportSectionId);
  const endpoint = block.kind === "graphql" ? block.endpoint : block.url;
  const meta = (status: number | undefined, at: number | undefined) => ({
    kind: block.kind,
    title: block.title,
    endpoint,
    status,
    at,
  });
  const summaryBase = { title: block.title, kind: block.kind, blockId: block.reportSectionId };

  let data: unknown;
  let status: number | undefined;
  let at: number | undefined;
  if (live?.status === "success") {
    data = live.data;
    status = live.httpStatus;
    at = live.at;
  } else if (block.snapshot && live?.status !== "error") {
    data = block.snapshot.data;
    status = block.snapshot.status;
    at = block.snapshot.at;
  } else if (live?.status === "error") {
    return {
      ref,
      status: "failed",
      reason: live.error ?? "the last run failed",
      value: { data: null, rows: [], columns: [], meta: meta(live.httpStatus, live.at) },
      summary: { ...summaryBase, rows: 0, columns: [] },
      version: `error:${live.at}`,
    };
  } else {
    return {
      ref,
      status: "notRun",
      reason: live?.status === "running" ? "still running" : "not run yet — run it to use its data",
      value: { data: null, rows: [], columns: [], meta: meta(undefined, undefined) },
      summary: { ...summaryBase, rows: 0, columns: [] },
      version: "none",
    };
  }
  const { rows } = resolveRows(data, block.rowsPath);
  const columns = rows ? inferColumns(rows) : [];
  return {
    ref,
    status: "ok",
    value: { data, rows: rows ?? [], columns, meta: meta(status, at) },
    summary: { ...summaryBase, rows: rows?.length ?? 0, columns },
    version: String(at),
  };
};

// ---------- notebooks ----------

const resolveNotebook = (block: NotebookBlock, ref: string): ResolvedInput => {
  const live = notebookResultsStore.get(block.reportSectionId);
  const summaryBase = { title: block.title, kind: "notebook" as const, blockId: block.reportSectionId };
  const withValue = (value: unknown, version: string): ResolvedInput => {
    const rows = Array.isArray(value) && value.every(isPlainObject) ? (value as Record<string, unknown>[]) : null;
    const columns = rows ? inferColumns(rows) : [];
    return { ref, status: "ok", value, summary: { ...summaryBase, rows: rows?.length ?? 0, columns }, version };
  };
  if (live?.status === "success") {
    if (live.outputType === "dom" || live.outputType === "none") {
      return {
        ref,
        status: "chartOnly",
        reason: "chart only — return data to use as an input",
        value: null,
        summary: { ...summaryBase, rows: 0, columns: [] },
        version: String(live.at),
      };
    }
    return withValue(live.value ?? null, String(live.at));
  }
  if (live?.status === "error") {
    return {
      ref,
      status: "failed",
      reason: live.error.message,
      value: null,
      summary: { ...summaryBase, rows: 0, columns: [] },
      version: `error:${live.at}`,
    };
  }
  if (block.snapshot?.value !== undefined) return withValue(block.snapshot.value, `snap:${block.snapshot.at}`);
  if (block.lastRun?.ok && (block.lastRun.outputType === "dom" || block.lastRun.outputType === "none")) {
    return {
      ref,
      status: "chartOnly",
      reason: "chart only — return data to use as an input",
      value: null,
      summary: { ...summaryBase, rows: 0, columns: [] },
      version: `snap:${block.lastRun.at}`,
    };
  }
  return {
    ref,
    status: "notRun",
    reason: live?.status === "running" ? "still running" : "not run yet — expand it and run",
    value: null,
    summary: { ...summaryBase, rows: 0, columns: [] },
    version: "none",
  };
};

// ---------- entry points ----------

export const resolveInput = (blocks: ReportBlock[], ref: string): ResolvedInput => {
  const block = blocks.find((b) => refOf(b) === ref);
  if (!block) {
    return {
      ref,
      status: "missing",
      reason: "no block with this ref",
      value: null,
      summary: { title: ref, kind: "table", rows: 0, columns: [] },
      version: "missing",
    };
  }
  if (isWidget(block)) return resolveWidget(block, ref);
  if (isNotebook(block)) return resolveNotebook(block, ref);
  if (isDataBlock(block)) return resolveDataBlock(block, ref);
  throw new Error(`Block ${ref} cannot be an input`);
};

export const resolveInputs = (blocks: ReportBlock[], notebook: NotebookBlock): ResolvedInput[] =>
  notebook.inputs.map((ref) => resolveInput(blocks, ref));

/** Cheap hash of the inputs' versions; a change means the notebook should re-run. */
export const inputsHash = (inputs: ResolvedInput[]): string =>
  inputs.map((i) => `${i.ref}=${i.version}`).join("|");

/** Blocks that can be linked as inputs: everything with (or that can get) a ref, except narrative. */
export const linkableBlocks = (blocks: ReportBlock[], notebook: NotebookBlock): ReportBlock[] =>
  blocks.filter(
    (b) => b.reportSectionId !== notebook.reportSectionId && (isWidget(b) || isDataBlock(b) || isNotebook(b))
  );
