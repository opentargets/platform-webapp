import {
  getCoreRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import useRatchetMinHeight from "../../../hooks/useRatchetMinHeight";
import { searchFilter } from "../OtTable";
import { INIT_PAGE_SIZE, type OtTableServerProps } from "../types/tableTypes";
import { getDefaultSortObj } from "../utils/tableUtils";
import OtTableServerControls from "./components/OtTableServerControls";
import OtTableServerPagination from "./components/OtTableServerPagination";
import OtTableServerRows from "./components/OtTableServerRows";
import useRequestVariables from "./hooks/useRequestVariables";
import useServerPage from "./hooks/useServerPage";
import useTableColumns from "./hooks/useTableColumns";
import useWholeDataset from "./hooks/useWholeDataset";
import { matchesSearch, sortRows } from "./utils/localRows";

/**
 * Table whose pagination (and optionally sorting and text search) is driven by
 * the server. Every page change issues a query with `index`/`size` variables
 * (the API's `page: { index, size }` input); the table holds one page at a time.
 *
 * - `dataPath` points at the `{ count, rows }` object inside the response
 *   (e.g. `disease.phenotypes`).
 * - A column's `sortField` enables server-side sorting with the API's
 *   `{ sort: [{ key, direction }] }` input. Without server sort fields, sorting
 *   fetches the whole dataset once, sorts it locally by the column's comparator
 *   or value, and paginates the result locally.
 * - The union of column `searchFields` enables server-side search using the
 *   API's `{ text, fields }` input. Without server search fields, a search term
 *   fetches the whole dataset once, filters it locally with the same matcher as
 *   the client-side table, and paginates the matches locally.
 */
function OtTableServer<Row extends object, ServerRow extends object = Row>({
  columns = [],
  query,
  variables,
  dataPath,
  rowField = "rows",
  countField = "count",
  transformRows,
  pageSize: initialPageSize = INIT_PAGE_SIZE,
  pageSizeOptions = [10, 25, 100],
  sortBy,
  order,
  showGlobalFilter = true,
  globalFilterPlaceholderText,
  verticalHeaders = false,
  showColumnVisibilityControl = true,
  showRowsPerPageControl = true,
  showPaginationAlways = true,
  dataDownloader = false,
  dataDownloaderColumns,
  dataDownloaderFileStem,
  enableMultipleRowSelection = false,
  getSelectedRows,
  onDataLoaded,
  prefetchAdjacentPages = false,
  onPagePrefetched,
  stableHeight = false,
  wrapControls,
}: OtTableServerProps<Row, ServerRow>): ReactElement {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(
    getDefaultSortObj(sortBy ?? "", order ?? "asc") ?? []
  );
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [tableBodyRef, tableMinHeight] = useRatchetMinHeight<HTMLDivElement>(
    JSON.stringify(variables),
    stableHeight
  );
  const enableRowSelection = !!getSelectedRows || enableMultipleRowSelection;

  const toRows = (rows: ServerRow[]): Row[] =>
    transformRows ? transformRows(rows) : (rows as unknown as Row[]);

  // what the server sorts and searches, and what falls back to the browser
  const {
    requestVariables,
    serverSortFields,
    serverSorting,
    localSearchTerm,
    localSearchMode,
    localSortMode,
    localMode,
  } = useRequestVariables({ columns, variables, sorting, search });

  const { mappedColumns, flatColumns, loadingCells, loadingRows } = useTableColumns({
    columns,
    serverSortFields,
    serverSorting,
    pageSize: pagination.pageSize,
  });

  // whole dataset, only fetched for a local search or sort
  const { allRows, allRowsLoading, downloadRows } = useWholeDataset<Row, ServerRow>({
    query,
    requestVariables,
    dataPath,
    rowField,
    countField,
    toRows,
    localMode,
  });

  const page = useServerPage<Row, ServerRow>({
    query,
    requestVariables,
    pagination,
    dataPath,
    rowField,
    countField,
    toRows,
    localMode,
    skip: localMode && !!allRows,
    onDataLoaded,
    // the first row of a page is selected when the page opens
    onPageLoaded: () => enableRowSelection && setRowSelection({ 0: true }),
    prefetchAdjacentPages,
    onPagePrefetched,
  });

  // local search and/or sort: the whole dataset filtered and ordered here, paginated here
  const localRows = useMemo(() => {
    if (!localMode || !allRows) return null;
    const matching = localSearchMode
      ? allRows.filter((row) => matchesSearch(row, localSearchTerm, flatColumns))
      : allRows;
    return localSortMode ? sortRows(matching, sorting, columns) : matching;
  }, [
    localMode,
    localSearchMode,
    localSortMode,
    allRows,
    localSearchTerm,
    flatColumns,
    sorting,
    columns,
  ]);

  const rowCount = localRows ? localRows.length : page.count;
  const loading = page.loading || allRowsLoading;

  // placeholder rows (and skeleton cells) until the first page, or the whole
  // dataset for a local search, has arrived
  const showLoadingRows = page.initialLoading || (localMode && !localRows);
  const tableColumns = useMemo(
    () => (showLoadingRows ? loadingCells : mappedColumns),
    [showLoadingRows, loadingCells, mappedColumns]
  );
  const tableData = useMemo(() => {
    if (showLoadingRows) return loadingRows;
    if (localRows) {
      const start = pagination.pageIndex * pagination.pageSize;
      return localRows.slice(start, start + pagination.pageSize);
    }
    return page.rows;
  }, [showLoadingRows, page.rows, localRows, loadingRows, pagination]);

  // reset to the first page whenever anything other than the page changes
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [requestVariables, localSearchTerm, sorting]);

  const table = useReactTable<Row>({
    data: tableData,
    columns: tableColumns,
    rowCount,
    state: { pagination, sorting, rowSelection },
    // the OtTable module augments FilterFns with searchFilterFn, which makes it a required option
    filterFns: { searchFilterFn: searchFilter },
    manualPagination: true,
    // the server orders the rows, or sortRows does on the whole dataset; never the current page alone
    manualSorting: true,
    enableSorting: true,
    autoResetPageIndex: false,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection,
    enableMultiRowSelection: enableMultipleRowSelection,
    onRowSelectionChange: setRowSelection,
  });

  useEffect(() => {
    enableRowSelection && getSelectedRows?.(table.getSelectedRowModel().rows);
  }, [table.getSelectedRowModel()]);

  return (
    <div>
      <OtTableServerControls
        table={table}
        columns={columns}
        onSearch={setSearch}
        showGlobalFilter={showGlobalFilter}
        globalFilterPlaceholderText={globalFilterPlaceholderText}
        showColumnVisibilityControl={showColumnVisibilityControl}
        dataDownloader={dataDownloader}
        dataDownloaderColumns={dataDownloaderColumns}
        dataDownloaderFileStem={dataDownloaderFileStem}
        downloadRows={downloadRows}
        query={query}
        playgroundVariables={{ ...requestVariables, index: 0, size: pagination.pageSize }}
        wrapControls={wrapControls}
      />
      <OtTableServerRows
        table={table}
        verticalHeaders={verticalHeaders}
        enableRowSelection={enableRowSelection}
        bodyRef={tableBodyRef}
        minHeight={tableMinHeight}
      />
      <OtTableServerPagination
        table={table}
        pagination={pagination}
        rowCount={rowCount}
        loading={loading}
        initialLoading={page.initialLoading}
        pageSizeOptions={pageSizeOptions}
        showRowsPerPageControl={showRowsPerPageControl}
        showPaginationAlways={showPaginationAlways}
        onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
      />
    </div>
  );
}

export default OtTableServer;
