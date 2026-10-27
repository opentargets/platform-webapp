import {
  faAngleLeft,
  faAngleRight,
  faArrowDown,
  faArrowUp,
  faBackwardStep,
  faForwardStep,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  CircularProgress,
  GridLegacy,
  IconButton,
  NativeSelect,
  Skeleton,
} from "@mui/material";
import { rankItem } from "@tanstack/match-sorter-utils";
import {
  type Cell,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type PaginationState,
  type SortingState,
  type Row as TableRow,
  useReactTable,
} from "@tanstack/react-table";
import _ from "lodash";
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import useBatchDownloader from "../../hooks/useBatchDownloader";
import { useApolloClient } from "../../providers/OTApolloProvider/OTApolloProvider";
import DataDownloader from "../DataDownloader";
import Tooltip from "../Tooltip";
import { searchFilter } from "./OtTable";
import OtTableColumnVisibility from "./OtTableColumnVisibility";
import OtTableSearch from "./OtTableSearch";
import {
  FontAwesomeIconPadded,
  OtTableCellContainer,
  OtTableContainer,
  OtTableHeader,
  OtTableHeaderText,
  OtTD,
  OtTH,
  OtTR,
} from "./otTableLayout";
import { INIT_PAGE_SIZE, type OtTableServerProps } from "./types/tableTypes";
import {
  getCurrentPagePosition,
  getDefaultSortObj,
  getFilterValueFromObject,
  getLoadingRows,
  mapTableColumnToTanstackColumns,
} from "./utils/tableUtils";

type ServerState<Row> = {
  rows: Row[];
  count: number;
  loading: boolean;
  initialLoading: boolean;
  error: Error | null;
};

type ServerPage<ServerRow> = Partial<Record<string, ServerRow[] | number>>;

const flattenColumns = <Row,>(columns: ColumnDef<Row>[]): ColumnDef<Row>[] =>
  columns.flatMap((column) =>
    "columns" in column && column.columns ? flattenColumns(column.columns) : [column]
  );

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// same matcher as the client-side OtTable: fuzzy rank on any column value, or a
// case-insensitive substring match over the whole flattened row
function matchesSearch<Row extends object>(
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

function getLoadingCells<Row>(columns: ColumnDef<Row>[]): ColumnDef<Row>[] {
  return columns.map((column) =>
    "columns" in column && column.columns
      ? { ...column, columns: getLoadingCells(column.columns) }
      : { ...column, cell: () => <Skeleton sx={{ minWidth: "50px" }} variant="text" /> }
  );
}

/**
 * Table whose pagination (and optionally sorting and text search) is driven by
 * the server. Every page change issues a query with `index`/`size` variables
 * (the API's `page: { index, size }` input); the table holds one page at a time.
 *
 * - `dataPath` points at the `{ count, rows }` object inside the response
 *   (e.g. `disease.phenotypes`).
 * - `getSortVariables` turns the react-table sorting state into query
 *   variables (e.g. `{ sort: [{ key, direction }] }`). When it is omitted the
 *   columns are not sortable, since client-side sorting would only reorder the
 *   current page.
 * - `searchVariable` names the query variable that receives the global search
 *   text. When it is omitted (the API field has no search argument) a search
 *   term makes the table fetch the whole dataset once, filter it locally with
 *   the same matcher as the client-side table, and paginate the matches
 *   locally; clearing the box returns to server pagination.
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
  getSortVariables,
  searchVariable,
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
  wrapControls,
}: OtTableServerProps<Row, ServerRow>): ReactElement {
  const client = useApolloClient();
  const [state, setState] = useState<ServerState<Row>>({
    rows: [],
    count: 0,
    loading: true,
    initialLoading: true,
    error: null,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(
    getDefaultSortObj(sortBy ?? "", order ?? "asc") ?? []
  );
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const requestId = useRef(0);
  // whole dataset, only fetched for a local search
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [allRowsLoading, setAllRowsLoading] = useState(false);

  const memoizedVariables = useMemo(() => ({ ...variables }), [JSON.stringify(variables)]);
  const serverSorting = !!getSortVariables;
  const serverSearch = !!searchVariable;
  const serverSearchTerm = serverSearch ? search.trim() : "";
  const localSearchTerm = serverSearch ? "" : search.trim();
  const localSearchMode = localSearchTerm.length > 0;
  const enableRowSelection = !!getSelectedRows || enableMultipleRowSelection;

  const toRows = (rows: ServerRow[]): Row[] =>
    transformRows ? transformRows(rows) : (rows as unknown as Row[]);

  const mappedColumns = useMemo(
    () => mapTableColumnToTanstackColumns(columns) as unknown as ColumnDef<Row>[],
    [columns]
  );
  const flatColumns = useMemo(() => flattenColumns(mappedColumns), [mappedColumns]);
  const loadingCells = useMemo(() => getLoadingCells(mappedColumns), [mappedColumns]);
  const loadingRows = useMemo(
    () => getLoadingRows(pagination.pageSize) as unknown as Row[],
    [pagination.pageSize]
  );

  // variables shared by the page requests and the full-dataset download
  const requestVariables = useMemo(
    () => ({
      ...memoizedVariables,
      ...(getSortVariables ? getSortVariables(sorting) : {}),
      // omitted when empty so the first page shares its cache entry with the section's own query
      ...(searchVariable && serverSearchTerm ? { [searchVariable]: serverSearchTerm } : {}),
    }),
    [memoizedVariables, getSortVariables, sorting, searchVariable, serverSearchTerm]
  );

  // local search: every matching row of the whole dataset, paginated here
  const filteredRows = useMemo(() => {
    if (!localSearchMode || !allRows) return null;
    return allRows.filter((row) => matchesSearch(row, localSearchTerm, flatColumns));
  }, [localSearchMode, allRows, localSearchTerm, flatColumns]);

  const rowCount = filteredRows ? filteredRows.length : state.count;
  const loading = state.loading || allRowsLoading;

  // placeholder rows (and skeleton cells) until the first page, or the whole
  // dataset for a local search, has arrived
  const showLoadingRows = state.initialLoading || (localSearchMode && !filteredRows);
  const tableColumns = useMemo(
    () => (showLoadingRows ? loadingCells : mappedColumns),
    [showLoadingRows, loadingCells, mappedColumns]
  );
  const tableData = useMemo(() => {
    if (showLoadingRows) return loadingRows;
    if (filteredRows) {
      const start = pagination.pageIndex * pagination.pageSize;
      return filteredRows.slice(start, start + pagination.pageSize);
    }
    return state.rows;
  }, [showLoadingRows, state.rows, filteredRows, loadingRows, pagination]);

  // reset to the first page whenever anything other than the page changes
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [requestVariables, localSearchTerm]);

  // the whole dataset is only valid for the current variables
  useEffect(() => {
    setAllRows(null);
  }, [requestVariables]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true }));
    client
      .query<Record<string, unknown>>({
        query,
        variables: {
          ...requestVariables,
          index: pagination.pageIndex,
          size: pagination.pageSize,
        },
        fetchPolicy: "cache-first",
      })
      .then((response) => {
        if (currentRequest !== requestId.current) return;
        const page = _.get(response.data, dataPath, {}) as ServerPage<ServerRow>;
        const rows = (page[rowField] ?? []) as ServerRow[];
        const count = (page[countField] ?? 0) as number;
        setState({ rows: toRows(rows), count, loading: false, initialLoading: false, error: null });
        onDataLoaded?.(response.data);
        enableRowSelection && setRowSelection({ 0: true });
      })
      .catch((error: Error) => {
        if (currentRequest !== requestId.current) return;
        setState({ rows: [], count: 0, loading: false, initialLoading: false, error });
      });
  }, [client, query, requestVariables, pagination.pageIndex, pagination.pageSize, dataPath]);

  const table = useReactTable<Row>({
    data: tableData,
    columns: tableColumns,
    rowCount,
    state: { pagination, sorting, rowSelection },
    // the OtTable module augments FilterFns with searchFilterFn, which makes it a required option
    filterFns: { searchFilterFn: searchFilter },
    manualPagination: true,
    manualSorting: serverSorting,
    enableSorting: serverSorting,
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

  // the downloader reads from the Apollo result, hence the `data.` prefix
  const getWholeDataset: () => Promise<ServerRow[]> = useBatchDownloader(
    query,
    requestVariables,
    `data.${dataPath}`,
    rowField,
    countField
  );
  const downloadRows = async (): Promise<Row[]> => toRows(await getWholeDataset());

  // fetch the whole dataset the first time a local search term is typed
  useEffect(() => {
    if (!localSearchMode || allRows !== null || allRowsLoading) return;
    let isCurrent = true;
    setAllRowsLoading(true);
    downloadRows()
      .then((rows) => {
        if (isCurrent) setAllRows(rows);
      })
      .catch((error: Error) => {
        if (!isCurrent) return;
        setState((prev) => ({ ...prev, error }));
        setAllRows([]);
      })
      .finally(() => isCurrent && setAllRowsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [localSearchMode, allRows, requestVariables]);

  function onRowSelection(row: TableRow<Row>) {
    enableRowSelection && row.toggleSelected();
  }

  function getCellData(cell: Cell<Row, unknown>): ReactNode {
    return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
  }

  const playgroundVariables = { ...requestVariables, index: 0, size: pagination.pageSize };

  const searchControl = showGlobalFilter ? (
    <OtTableSearch setGlobalSearchTerm={setSearch} placeholderText={globalFilterPlaceholderText} />
  ) : null;

  const rightControls = (
    <>
      {showColumnVisibilityControl && <OtTableColumnVisibility table={table} />}
      {dataDownloader && (
        <DataDownloader
          columns={dataDownloaderColumns || columns}
          rows={downloadRows}
          fileStem={dataDownloaderFileStem}
          query={query.loc?.source.body}
          variables={playgroundVariables}
        />
      )}
    </>
  );

  return (
    <div>
      {wrapControls ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            ...(typeof wrapControls === "object" ? wrapControls : {}),
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "end", gap: 1 }}>{rightControls}</Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "left",
              width: { xs: "100%", sm: "fit-content", md: "100%" },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: "210px" }}>{searchControl}</Box>
          </Box>
        </Box>
      ) : (
        <GridLegacy
          container
          sx={{ display: "flex", justifyContent: "space-between", gap: { xs: 2, md: 0 } }}
        >
          <GridLegacy item sm={12} md={4}>
            {searchControl}
          </GridLegacy>
          <GridLegacy item sm={12} md={8} sx={{ display: "flex", justifyContent: "end", gap: 1 }}>
            {rightControls}
          </GridLegacy>
        </GridLegacy>
      )}

      <Box sx={{ w: 1, overflowX: "auto", marginTop: (theme) => theme.spacing(3) }}>
        <OtTableContainer data-testid="ot-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <OtTH
                    key={header.id}
                    colSpan={header.colSpan}
                    stickyColumn={header.column.columnDef.sticky}
                  >
                    {header.isPlaceholder ? null : (
                      <OtTableHeader
                        canBeSorted={header.column.getCanSort()}
                        numeric={header.column.columnDef.numeric}
                      >
                        <OtTableHeaderText
                          verticalHeader={header.column.columnDef.verticalHeader || verticalHeaders}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <Tooltip
                            style={""}
                            title={header.column.columnDef.tooltip}
                            showHelpIcon={!!header.column.columnDef.tooltip}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </Tooltip>
                          {!header.column.getIsSorted() && header.column.getCanSort() && (
                            <FontAwesomeIcon
                              size="sm"
                              icon={faArrowUp}
                              className="sortableColumn"
                            />
                          )}
                          {{
                            asc: <FontAwesomeIconPadded size="sm" icon={faArrowUp} />,
                            desc: <FontAwesomeIconPadded size="sm" icon={faArrowDown} />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </OtTableHeaderText>
                      </OtTableHeader>
                    )}
                  </OtTH>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <OtTR
                key={row.id}
                onClick={() => onRowSelection(row)}
                enableRowSelection={enableRowSelection}
                isSelected={row.getIsSelected()}
              >
                {row.getVisibleCells().map((cell) => (
                  <OtTD key={cell.id} stickyColumn={cell.column.columnDef.sticky}>
                    <OtTableCellContainer numeric={cell.column.columnDef.numeric}>
                      {getCellData(cell)}
                    </OtTableCellContainer>
                  </OtTD>
                ))}
              </OtTR>
            ))}
          </tbody>
        </OtTableContainer>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          padding: (theme) => `${theme.spacing(2)} 0 `,
        }}
      >
        {loading && !state.initialLoading && (
          <CircularProgress sx={{ mx: (theme) => theme.spacing(2) }} size={25} />
        )}
        {showRowsPerPageControl && (
          <div>
            <label htmlFor="paginationSelect">Rows per page:</label>
            <NativeSelect
              id="paginationSelect"
              disableUnderline
              disabled={loading}
              sx={{ pl: (theme) => theme.spacing(2) }}
              value={pagination.pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {(showPaginationAlways || table.getPageCount() > 1) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: (theme) => theme.spacing(3),
              marginLeft: (theme) => theme.spacing(3),
            }}
          >
            <div>
              <span>
                {getCurrentPagePosition(pagination.pageIndex, pagination.pageSize, rowCount)}
              </span>
            </div>
            <div className="paginationAction">
              <IconButton
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage() || loading}
                aria-label="First Page"
                data-testid="pagination-first-button"
              >
                <FontAwesomeIcon size="2xs" icon={faBackwardStep} />
              </IconButton>
              <IconButton
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || loading}
                aria-label="Previous Page"
                data-testid="pagination-previous-button"
              >
                <FontAwesomeIcon size="2xs" icon={faAngleLeft} />
              </IconButton>
              <IconButton
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || loading}
                aria-label="Next Page"
                data-testid="pagination-next-button"
              >
                <FontAwesomeIcon size="2xs" icon={faAngleRight} />
              </IconButton>
              <IconButton
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage() || loading}
                aria-label="Last Page"
                data-testid="pagination-last-button"
              >
                <FontAwesomeIcon size="2xs" icon={faForwardStep} />
              </IconButton>
            </div>
          </Box>
        )}
      </Box>
    </div>
  );
}

export default OtTableServer;
