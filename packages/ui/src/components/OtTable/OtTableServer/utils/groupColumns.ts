import type { ColumnDef } from "@tanstack/react-table";

/**
 * Nests each run of adjacent columns that share a group under one header column.
 * `groups[i]` is the group of `columns[i]`; columns without one stay at the top level.
 */
export function groupColumns<Row>(
  columns: ColumnDef<Row>[],
  groups: (string | undefined)[]
): ColumnDef<Row>[] {
  const result: ColumnDef<Row>[] = [];
  let open: { header: string; columns: ColumnDef<Row>[] } | null = null;
  columns.forEach((column, index) => {
    const group = groups[index];
    if (!group) {
      open = null;
      result.push(column);
    } else if (open?.header === group) {
      open.columns.push(column);
    } else {
      open = { header: group, columns: [column] };
      result.push(open);
    }
  });
  return result;
}
