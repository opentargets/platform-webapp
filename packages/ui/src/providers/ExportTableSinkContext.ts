import { createContext, useContext } from "react";
import _ from "lodash";
import type { TableData } from "../components/Report/export/types";

/**
 * What a table publishes to the export RenderHost: its current row model as
 * plain values (filtered + sorted, all pages), or `loading` while it fetches.
 */
export interface ExportTableSnapshot {
  loading: boolean;
  table?: TableData;
}

// `snapshot: null` means the table unmounted
export type ExportTableSink = (key: string, snapshot: ExportTableSnapshot | null) => void;

/**
 * Only provided by the export RenderHost. Outside an export render this is null
 * and tables do nothing extra.
 */
export const ExportTableSinkContext = createContext<ExportTableSink | null>(null);

export const useExportTableSink = () => useContext(ExportTableSinkContext);

type ExportColumn = {
  id?: string;
  label?: unknown;
  exportLabel?: string;
  exportValue?: false | ((row: any) => unknown);
  filterValue?: (row: any) => unknown;
  propertyPath?: string;
  columns?: ExportColumn[];
};

const leafColumns = (columns: ExportColumn[]): ExportColumn[] =>
  columns.flatMap((c) => (Array.isArray(c.columns) ? leafColumns(c.columns) : [c]));

const plainValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => plainValue(v)).join(", ");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const named = obj.name ?? obj.label ?? obj.approvedSymbol ?? obj.id;
    return named !== undefined && typeof named !== "object" ? named : JSON.stringify(value);
  }
  return value;
};

const columnValue = (column: ExportColumn, row: Record<string, unknown>): unknown => {
  try {
    if (typeof column.exportValue === "function") return plainValue(column.exportValue(row));
    const raw = _.get(row, column.propertyPath || column.id || "");
    if ((raw === undefined || typeof raw === "object") && typeof column.filterValue === "function") {
      return plainValue(column.filterValue(row));
    }
    return plainValue(raw);
  } catch {
    return "";
  }
};

/**
 * OtTable column defs (the "classic" shape: id, label, exportValue, exportLabel,
 * filterValue, propertyPath; nested groups flattened) + original rows → TableData,
 * mirroring DataDownloader. `visibleIds` limits it to the columns currently shown.
 */
export const toExportTable = (
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  { totalRows = rows.length, visibleIds }: { totalRows?: number; visibleIds?: Set<string> } = {}
): TableData => {
  const exported = leafColumns(columns).filter(
    (c) => c.id && c.exportValue !== false && (!visibleIds || visibleIds.has(c.id))
  );
  return {
    columns: exported.map((c) => ({
      key: c.id as string,
      label: c.exportLabel || (typeof c.label === "string" && c.label) || (c.id as string),
    })),
    rows: rows.map((row) =>
      Object.fromEntries(exported.map((c) => [c.id as string, columnValue(c, row)]))
    ),
    totalRows,
  };
};
