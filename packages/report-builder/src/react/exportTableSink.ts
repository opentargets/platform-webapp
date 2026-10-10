import { createContext, useContext } from "react";
import type { TableData } from "../core";

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
