import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { OtTableColumn } from "../../types/tableTypes";
import { getLoadingRows, mapTableColumnToTanstackColumns } from "../../utils/tableUtils";
import { getLoadingCells } from "../utils/loadingCells";
import { groupColumns } from "../utils/groupColumns";
import { flattenColumns } from "../utils/localRows";

type UseTableColumnsOptions<Row> = {
  columns: OtTableColumn<Row>[];
  serverSortFields: Map<string, string>;
  serverSorting: boolean;
  pageSize: number;
};

/** the column definitions for the table library, and their loading placeholders */
function useTableColumns<Row>({
  columns,
  serverSortFields,
  serverSorting,
  pageSize,
}: UseTableColumnsOptions<Row>) {
  // with server sorting, only the columns the API can sort by are sortable
  const tableColumnsConfig = useMemo(
    () =>
      serverSorting
        ? columns.map((column) => ({ ...column, sortable: serverSortFields.has(column.id) }))
        : columns,
    [columns, serverSortFields, serverSorting]
  );
  const mappedColumns = useMemo(
    () =>
      groupColumns(
        mapTableColumnToTanstackColumns(tableColumnsConfig) as unknown as ColumnDef<Row>[],
        tableColumnsConfig.map((column) => column.group)
      ),
    [tableColumnsConfig]
  );
  const flatColumns = useMemo(() => flattenColumns(mappedColumns), [mappedColumns]);
  const loadingCells = useMemo(() => getLoadingCells(mappedColumns), [mappedColumns]);
  const loadingRows = useMemo(() => getLoadingRows(pageSize) as unknown as Row[], [pageSize]);

  return { mappedColumns, flatColumns, loadingCells, loadingRows };
}

export default useTableColumns;
