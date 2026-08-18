import { ReactElement, ReactNode, useEffect, useMemo, useReducer, useState } from "react";
import { Box, CircularProgress, GridLegacy, IconButton, NativeSelect, Skeleton } from "@mui/material";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  PaginationState,
  Row,
} from "@tanstack/react-table";
import { faAngleLeft, faAngleRight, faBackwardStep } from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import OtTableSearch from "./OtTableSearch";
import { INIT_PAGE_SIZE, OtTableSSPProps } from "./types/tableTypes";
import {
  OtTableContainer,
  OtTableHeader,
  OtTH,
  OtTableHeaderText,
  OtTD,
  OtTableCellContainer,
  OtTR,
} from "./otTableLayout";
import DataDownloader from "../DataDownloader";
import {
  getCurrentPagePosition,
  isNestedColumns,
  mapTableColumnToTanstackColumns,
} from "./utils/tableUtils";
import Tooltip from "../Tooltip";
import OtTableColumnVisibility from "./OtTableColumnVisibility";

import { getTableRows } from "./service/tableService";
import { createInitialState, otTableReducer } from "./context/otTableReducer";
import { addRows, setLoading, setNewData, textSearch } from "./context/otTableActions";

import useCursorBatchDownloader from "../../hooks/useCursorBatchDownloader";
import { useApolloClient } from "../../providers/OTApolloProvider/OTApolloProvider";

function OtTableSSP({
  showGlobalFilter = true,
  columns = [],
  verticalHeaders = false,
  query,
  variables,
  entity,
  sectionName,
  dataDownloaderFileStem,
  dataDownloaderColumns,
  dataDownloader,
  showColumnVisibilityControl = true,
  setInitialRequestData,
  enableMultipleRowSelection = false,
  getSelectedRows,
}: OtTableSSPProps): ReactElement {
  const client = useApolloClient();
  const [state, dispatch] = useReducer(otTableReducer, "", createInitialState);
  const memoizedVariables = useMemo(() => ({ ...variables }), [JSON.stringify(variables)]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: INIT_PAGE_SIZE,
  });

  const enableRowSelection = !!getSelectedRows || enableMultipleRowSelection;
  const mappedColumns = mapTableColumnToTanstackColumns(columns);
  const loadingCells = getLoadingCells(mappedColumns);
  const tableColumns = useMemo(
    () => (state.initialLoading ? loadingCells : mappedColumns),
    [state.initialLoading]
  );

  const table = useReactTable({
    data: state.rows,
    columns: tableColumns,
    rowCount: state.count,
    state: {
      pagination,
      rowSelection,
    },
    autoResetPageIndex: false,
    // manualPagination: true,
    onPaginationChange: onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: enableRowSelection,
    enableMultiRowSelection: enableMultipleRowSelection,
    onRowSelectionChange: setRowSelection,
  });

  /****
   * call the higher order function if row selection is enabled
   ****/
  function onRowSelection(row: Row<any>) {
    enableRowSelection && row.toggleSelected();
  }

  /**********************************************
   * DEFAULT FUNCTION CALLBACK TRIGGERED BY
   * REACT TABLE IN ANY PAGE CHANGE EVENT *
   * @param:
   * updater: @type callback function
   **********************************************/

  function onPaginationChange(updater) {
    const newPagination = updater(pagination);

    // switch () {
    //   case (pagination.pageSize !== newPagination.pageSize): {
    //     onPageSizeChange(newPagination);
    //     break;
    //   }
    //   case (newPagination.pageIndex > pagination.pageIndex): {
    //     onPageChange(newPagination);
    //     break;
    //   }
    //   default: {
    //   setPagination(newPagination);
    //   break;
    //   }
    // }

    if (pagination.pageSize !== newPagination.pageSize) {
      onPageSizeChange(newPagination);
    } else if (newPagination.pageIndex > pagination.pageIndex) {
      onPageChange(newPagination);
    } else {
      setPagination(newPagination);
    }
  }

  /**********************************************
   * FUNCTION FOR PAGE INDEX CHANGE
   * CHECK IF MORE DATA IS REQUIRED BY CHECKING
   * NUMBER OF ROWS ALREADY FETCHED, PREVENT EXCESSIVE
   * API CALLS IN CASE USER PAGINATE BACK AND FORTH
   * @param:
   * newPagination: @type PaginationState "@tanstack/react-table"
   **********************************************/
  function onPageChange(newPagination: PaginationState) {
    if (needMoreData(pagination.pageSize, newPagination.pageIndex)) {
      addNewData(newPagination);
    } else {
      setPagination(newPagination);
    }
  }

  /**********************************************
   * FUNCTION FOR PAGE SIZE CHANGE
   * @param:
   * newPagination: @type PaginationState "@tanstack/react-table"
   **********************************************/
  function onPageSizeChange(newPagination: PaginationState) {
    setTableData({ newPagination });
  }

  /**********************************************
   * FUNCTION TO FETCH MORE DATA (PAGINATION)
   * SETTING LOADING TRUE BEFORE FETCHING
   * FETCH DATA AS PER TABLE STATE
   * SETS PAGINATION AFTER DATA IS FETCHED TO AVOID
   * SHOWING EMPTY ROWS
   * @param:
   * newPagination: @type PaginationState "@tanstack/react-table"
   **********************************************/

  function addNewData(newPagination: PaginationState) {
    dispatch(setLoading(true));
    getTableRows({
      query,
      variables: memoizedVariables,
      cursor: state.cursor,
      size: pagination.pageSize,
      freeTextQuery: state.freeTextQuery,
      client,
    }).then(d => {
      dispatch(addRows(d.data[entity][sectionName]));
      setPagination(newPagination);
    });
  }

  /**********************************************
   * FUNCTION TO FETCH NEW DATA (PAGE SIZE CHANGE OR SEARCH TEXT)
   * SETTING LOADING TRUE BEFORE FETCHING
   * FETCH DATA AND PASSING CURSOR AS NULL
   * @param:
   * newPagination: @type PaginationState "@tanstack/react-table"
   **********************************************/
  function setTableData({ newPagination = pagination, freeTextQuery = state.freeTextQuery }) {
    dispatch(setLoading(true));
    getTableRows({
      query,
      variables: memoizedVariables,
      cursor: null,
      size: newPagination.pageSize,
      freeTextQuery,
      client,
    }).then(d => {
      dispatch(setNewData(d.data[entity][sectionName]));
      if (!state.freeTextQuery) setInitialRequestData(d);
    });
  }

  /**********************************************
   * FUNCTION TO TO CHECK IF MORE DATA IS NEEDED
   * IN CASE USER PAGINATE BACKWARDS
   * @param:
   * pageSize: number
   * pageIndex: number
   * @return : boolean
   **********************************************/
  function needMoreData(pageSize: number, pageIndex: number) {
    const dataLength = table.options.data.length;
    return dataLength < (pageIndex + 1) * pageSize;
  }

  /*********************************
   * STORES ALL DATA IN FOR EXPORT *
   *********************************/
  const getWholeDataset = useCursorBatchDownloader(
    query,
    { ...memoizedVariables, freeTextQuery: state.freeTextQuery },
    `data[${entity}][${sectionName}]`
  );

  useEffect(() => {
    const newPagination = {
      pageIndex: 0,
      pageSize: pagination.pageSize,
    };
    setTableData({ newPagination, freeTextQuery: state.freeTextQuery });
    enableRowSelection && setRowSelection({ 0: true });
  }, [state.freeTextQuery, memoizedVariables]);

  useEffect(() => {
    enableRowSelection && getSelectedRows(table.getSelectedRowModel().rows);
  }, [table.getSelectedRowModel()]);

  function getCellData(cell: Record<string, unknown>): ReactNode {
    return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
  }

  const playgroundVariables = { ...memoizedVariables, cursor: null, size: 10 };

  return (
    <div>
      {/* Global Search */}
      <GridLegacy
        container
        sx={{ display: "flex", justifyContent: "space-between", gap: { xs: 2, md: 0 } }}
      >
        <GridLegacy item sm={12} md={4}>
          {showGlobalFilter && (
            <OtTableSearch
              setGlobalSearchTerm={freeTextQuery => {
                dispatch(textSearch(freeTextQuery));
              }}
            />
          )}
        </GridLegacy>

        <GridLegacy item sm={12} md={8} sx={{ display: "flex", justifyContent: "end", gap: 1 }}>
          {showColumnVisibilityControl && <OtTableColumnVisibility table={table} />}

          {dataDownloader && (
            <DataDownloader
              columns={dataDownloaderColumns || columns}
              rows={getWholeDataset}
              fileStem={dataDownloaderFileStem}
              query={query.loc.source.body}
              variables={playgroundVariables}
            />
          )}
        </GridLegacy>
      </GridLegacy>
      {/* Table component container */}
      <Box sx={{ w: 1, overflowX: "auto", marginTop: theme => theme.spacing(3) }}>
        {/* Table component */}
        <OtTableContainer>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <OtTH
                      key={header.id}
                      colSpan={header.colSpan}
                      stickyColumn={header.column.columnDef.sticky}
                    >
                      {header.isPlaceholder ? null : (
                        <OtTableHeader numeric={header.column.columnDef.numeric}>
                          <OtTableHeaderText
                            verticalHeader={
                              header.column.columnDef.verticalHeader || verticalHeaders
                            }
                            sx={{ typography: "subtitle2" }}
                          >
                            <Tooltip
                              style={""}
                              title={header.column.columnDef.tooltip}
                              showHelpIcon={!!header.column.columnDef.tooltip}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </Tooltip>
                          </OtTableHeaderText>
                        </OtTableHeader>
                      )}
                    </OtTH>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              return (
                <OtTR
                  key={row.id}
                  onClick={() => onRowSelection(row)}
                  enableRowSelection={enableRowSelection}
                  isSelected={row.getIsSelected()}
                >
                  {row.getVisibleCells().map(cell => {
                    return (
                      <OtTD key={cell.id} stickyColumn={cell.column.columnDef.sticky}>
                        <OtTableCellContainer numeric={cell.column.columnDef.numeric}>
                          {getCellData(cell)}
                          {/* {flexRender(cell.column.columnDef.cell, cell.getContext())} */}
                          {/* TODO: check NA value */}
                          {/* {Boolean(flexRender(cell.column.columnDef.cell, cell.getContext())) ||
                            naLabel} */}
                        </OtTableCellContainer>
                      </OtTD>
                    );
                  })}
                </OtTR>
              );
            })}
          </tbody>
        </OtTableContainer>
      </Box>

      {/* Table footer component container */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          padding: theme => `${theme.spacing(2)} 0 `,
        }}
      >
        {state.loading && <CircularProgress sx={{ mx: theme => theme.spacing(2) }} size={25} />}
        <div>
          <label htmlFor="paginationSelect">Rows per page:</label>
          <NativeSelect
            id="paginationSelect"
            disableUnderline
            disabled={state.loading}
            sx={{ pl: theme => theme.spacing(2) }}
            value={pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
              setPagination({
                pageIndex: 0,
                pageSize: Number(e.target.value),
              });
            }}
          >
            {/* TODO: set page size  */}
            {[10, 25, 100].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: theme => theme.spacing(3),
            marginLeft: theme => theme.spacing(3),
          }}
        >
          <div>
            <span>
              {getCurrentPagePosition(pagination.pageIndex, pagination.pageSize, state.count)}
            </span>
          </div>

          <div className="paginationAction">
            <IconButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || state.loading}
              aria-label="first page"
            >
              <FontAwesomeIcon size="2xs" icon={faBackwardStep} />
            </IconButton>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || state.loading}
              aria-label="previous page"
            >
              <FontAwesomeIcon size="2xs" icon={faAngleLeft} />
            </IconButton>

            <IconButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || state.loading}
              aria-label="next page"
            >
              <FontAwesomeIcon size="2xs" icon={faAngleRight} />
            </IconButton>
          </div>
        </Box>
      </Box>
    </div>
  );
}

// TODO: FIND A WAY TO USE SAME FUNCTION FROM CLIENT TABLE
function getLoadingCells(columms: Array<Record<string, unknown>>) {
  const arr: Record<string, unknown>[] = [];
  columms.forEach(e => {
    if (isNestedColumns(e)) {
      const headerObj = {
        header: e.header || e.label,
        columns: getLoadingCells(e.columns),
      };
      arr.push(headerObj);
    } else arr.push({ ...e, cell: () => <Skeleton sx={{ minWidth: "50px" }} variant="text" /> });
  });
  return arr;
}

export default OtTableSSP;
