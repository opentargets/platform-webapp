import { Skeleton } from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";

/** the table's columns with every cell replaced by a skeleton, for the first load */
export function getLoadingCells<Row>(columns: ColumnDef<Row>[]): ColumnDef<Row>[] {
  return columns.map((column) =>
    "columns" in column && column.columns
      ? { ...column, columns: getLoadingCells(column.columns) }
      : { ...column, cell: () => <Skeleton sx={{ minWidth: "50px" }} variant="text" /> }
  );
}
