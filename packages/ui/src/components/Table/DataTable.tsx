/* eslint-disable */
import { useReportState } from "../../providers/ReportComponentStateContext";

import Table from "./Table";
import { getPage } from "./utils";
import { globalFilter, getComparator } from "./sortingAndFiltering";
import { PaginationActionsComplete } from "./TablePaginationActions";

interface DataTableState {
  globalFilter: string;
  sorting: { id: string; desc: boolean }[];
  pagination: { pageIndex: number; pageSize: number };
}

function DataTable({
  noWrap,
  noWrapHeader,
  fixed,
  hover,
  showGlobalFilter,
  dataDownloader,
  dataDownloaderFileStem,
  headerGroups,
  columns,
  sortBy = null,
  order = "asc",
  pageSize: initialPageSize = 10,
  rows,
  rowsPerPageOptions = [],
  onRowClick,
  rowIsSelectable,
  onPagination = () => {},
  dataDownloaderColumns,
  loading,
  query,
  variables,
  // Report state key, for tables that share a file stem (e.g. the same table in several tabs)
  reportStateKey,
}) {
  // Search, sort and page, kept with the section in reports (same shape as OtTable's, so
  // the captured-state chips read the same). Keyed per table: a section can hold several.
  const tableKey = `dataTable:${
    reportStateKey || dataDownloaderFileStem || columns.map((c: { id: string }) => c.id).join(",")
  }`;
  const [tableState, setTableState] = useReportState<DataTableState>(tableKey, {
    globalFilter: "",
    sorting: sortBy ? [{ id: sortBy, desc: order === "desc" }] : [],
    pagination: { pageIndex: 0, pageSize: initialPageSize },
  });
  const page = tableState.pagination.pageIndex;
  const pageSize = tableState.pagination.pageSize;
  const globalFilterVal = tableState.globalFilter;
  // A saved sort on a column this table doesn't have (stale state) is ignored
  const savedSortId = tableState.sorting[0]?.id;
  const sortColumn =
    savedSortId && columns.some((c: { id: string }) => c.id === savedSortId) ? savedSortId : sortBy;
  const sortOrder = tableState.sorting[0] ? (tableState.sorting[0].desc ? "desc" : "asc") : order;
  const showPagination = rows.length > [...rowsPerPageOptions, initialPageSize].sort()[0];

  const handleGlobalFilterChange = globalFilter => {
    setTableState(prev => ({
      ...prev,
      globalFilter,
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  };

  const handleSortBy = sortBy => {
    const nextOrder = sortColumn === sortBy ? (sortOrder === "asc" ? "desc" : "asc") : "asc";
    setTableState(prev => ({ ...prev, sorting: [{ id: sortBy, desc: nextOrder === "desc" }] }));
  };

  const handlePageChange = page => {
    setTableState(prev => ({ ...prev, pagination: { ...prev.pagination, pageIndex: page } }));
    onPagination(page, pageSize);
  };

  const handleRowsPerPageChange = newPageSize => {
    const newPageSizeNumber = Number(newPageSize);
    setTableState(prev => ({ ...prev, pagination: { pageIndex: 0, pageSize: newPageSizeNumber } }));
  };

  let processedRows = [...rows];

  if (globalFilterVal) {
    processedRows = processedRows.filter(row => globalFilter(row, columns, globalFilterVal));
  }

  if (sortColumn) {
    processedRows.sort(getComparator(columns, sortOrder, sortColumn));
  }

  return (
    <Table
      noWrap={noWrap}
      noWrapHeader={noWrapHeader}
      fixed={fixed}
      hover={hover}
      showGlobalFilter={showGlobalFilter}
      globalFilter={globalFilterVal}
      dataDownloader={dataDownloader}
      dataDownloaderFileStem={dataDownloaderFileStem}
      dataDownloaderColumns={dataDownloaderColumns}
      headerGroups={headerGroups}
      sortBy={sortColumn}
      order={sortOrder}
      page={page}
      pageSize={pageSize}
      dataDownloaderRows={processedRows}
      columns={columns}
      rows={getPage(processedRows, page, pageSize)}
      rowCount={processedRows.length}
      onGlobalFilterChange={handleGlobalFilterChange}
      onSortBy={handleSortBy}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handleRowsPerPageChange}
      rowsPerPageOptions={rowsPerPageOptions}
      ActionsComponent={PaginationActionsComplete}
      onRowClick={onRowClick}
      rowIsSelectable={rowIsSelectable}
      showPagination={showPagination}
      loading={loading}
      query={query}
      variables={variables}
    />
  );
}

export default DataTable;
