import { rankItem } from "@tanstack/match-sorter-utils";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import _ from "lodash";
import type { OtTableColumn } from "../../types/tableTypes";
import { getFilterValueFromObject } from "../../utils/tableUtils";

export const flattenColumns = <Row,>(columns: ColumnDef<Row>[]): ColumnDef<Row>[] =>
  columns.flatMap((column) =>
    "columns" in column && column.columns ? flattenColumns(column.columns) : [column]
  );

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// same matcher as the client-side OtTable: fuzzy rank on any column value, or a
// case-insensitive substring match over the whole flattened row
export function matchesSearch<Row extends object>(
  row: Row,
  term: string,
  columns: ColumnDef<Row>[]
): boolean {
  const fuzzy = columns.some((column) => {
    if (!("accessorFn" in column) || !column.accessorFn) return false;
    const value = column.accessorFn(row, 0);
    return value != null && rankItem(value, term).passed;
  });
  return (
    fuzzy ||
    new RegExp(escapeRegExp(term), "i").test(
      getFilterValueFromObject(row as Record<string, unknown>)
    )
  );
}

const isEmptyValue = (value: unknown) => value == null || value === "";

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

// client-side fallback when the API field has no sort input: orders the whole
// dataset by the column's comparator, or by its filter value / id value, with
// empty values last in either direction
export function sortRows<Row extends object>(
  rows: Row[],
  sorting: SortingState,
  columns: OtTableColumn<Row>[]
): Row[] {
  const [sort] = sorting;
  const column = sort && columns.find((c) => c.id === sort.id);
  if (!sort || !column) return rows;
  const sortValue = (row: Row): unknown =>
    column.filterValue ? column.filterValue(row) : _.get(row, column.id);
  const direction = sort.desc ? -1 : 1;
  // a comparator handles its own empty values
  if (column.comparator) {
    const { comparator } = column;
    return [...rows].sort((a, b) => direction * comparator(a, b));
  }
  return [...rows].sort((a, b) => {
    const va = sortValue(a);
    const vb = sortValue(b);
    const emptyA = isEmptyValue(va);
    const emptyB = isEmptyValue(vb);
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    return direction * compareValues(va, vb);
  });
}
