import Papa from "papaparse";
import { TableColumn, TableColumnType } from "../../core";

export const MAX_TABLE_ROWS_STORED = 5000;
export const MAX_TABLE_COLUMNS = 50;

export interface ParsedTable {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  // Rows before truncation (excluding the header row)
  totalRows: number;
  delimiter: string;
}

/**
 * Parse CSV/TSV/pasted spreadsheet text (delimiter auto-detected) into raw cells
 */
export const parseCells = (text: string): { cells: unknown[][]; delimiter: string; error?: string } => {
  const result = Papa.parse<unknown[]>(text.trim(), {
    header: false,
    dynamicTyping: true,
    skipEmptyLines: true,
    delimiter: "",
  });
  const fatal = result.errors.find((e) => e.type === "Delimiter" && result.data.length === 0);
  return { cells: result.data, delimiter: result.meta.delimiter, error: fatal?.message };
};

const inferType = (values: unknown[]): TableColumnType => {
  const present = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (present.length === 0) return "string";
  if (present.every((v) => typeof v === "number")) return "number";
  if (present.every((v) => typeof v === "boolean")) return "boolean";
  return "string";
};

export const coerce = (value: unknown, type: TableColumnType): unknown => {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number") {
    const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    return /^(true|yes|y|1)$/i.test(String(value).trim());
  }
  return String(value);
};

/**
 * Build columns/rows from parsed cells. Column keys are positional (c0, c1…) so
 * headers with dots, spaces or duplicates never break table accessors.
 */
export const buildTable = (
  cells: unknown[][],
  firstRowIsHeader: boolean,
  types?: TableColumnType[],
  delimiter = ","
): ParsedTable => {
  const width = Math.min(
    MAX_TABLE_COLUMNS,
    cells.reduce((max, row) => Math.max(max, row.length), 0)
  );
  const header = firstRowIsHeader ? (cells[0] ?? []) : [];
  const body = firstRowIsHeader ? cells.slice(1) : cells;
  const kept = body.slice(0, MAX_TABLE_ROWS_STORED);

  const columns: TableColumn[] = Array.from({ length: width }, (_, i) => {
    const label =
      header[i] !== undefined && header[i] !== null && header[i] !== ""
        ? String(header[i])
        : `Column ${i + 1}`;
    return {
      key: `c${i}`,
      label,
      type: types?.[i] ?? inferType(kept.slice(0, 200).map((row) => row[i])),
    };
  });

  const rows = kept.map((row) =>
    Object.fromEntries(columns.map((column, i) => [column.key, coerce(row[i], column.type)]))
  );

  return {
    columns,
    rows,
    truncated: body.length > MAX_TABLE_ROWS_STORED || cells.some((row) => row.length > MAX_TABLE_COLUMNS),
    totalRows: body.length,
    delimiter,
  };
};

export const sourceTypeFor = (fileName: string | undefined, delimiter: string): "csv" | "tsv" | "paste" => {
  if (!fileName) return "paste";
  return delimiter === "\t" || /\.tsv$/i.test(fileName) ? "tsv" : "csv";
};
