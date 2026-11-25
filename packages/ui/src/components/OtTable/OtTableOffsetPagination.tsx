import { faAngleLeft, faAngleRight, faBackwardStep } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@apollo/client";
import { Box, CircularProgress, IconButton, NativeSelect, Skeleton } from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useApolloClient } from "../../providers/OTApolloProvider/OTApolloProvider";
import { downloaderChunkSize } from "@ot/constants";
import DataDownloader from "../DataDownloader";
import Tooltip from "../Tooltip";
import OtTableColumnVisibility from "./OtTableColumnVisibility";
import {
  OtTableCellContainer,
  OtTableContainer,
  OtTableHeader,
  OtTableHeaderText,
  OtTD,
  OtTH,
  OtTR,
} from "./otTableLayout";
import { getCurrentPagePosition, isNestedColumns, mapTableColumnToTanstackColumns } from "./utils/tableUtils";

type OtTableOffsetPaginationProps = {
  columns: Record<string, unknown>[];
  dataDownloader?: boolean;
  dataDownloaderColumns?: Record<string, unknown>[];
  dataDownloaderFileStem: string;
  dataPath?: string;
  entity: string;
  query: any;
  sectionName: string;
  setInitialRequestData: (request: { data: unknown; error: unknown; loading: boolean }) => void;
  showColumnVisibilityControl?: boolean;
  variables: Record<string, unknown>;
};

function OtTableOffsetPagination({
  columns,
  dataDownloader = false,
  dataDownloaderColumns,
  dataDownloaderFileStem,
  dataPath,
  entity,
  query,
  sectionName,
  setInitialRequestData,
  showColumnVisibilityControl = true,
  variables,
}: OtTableOffsetPaginationProps): ReactElement {
  const client = useApolloClient();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const variablesWithPage = useMemo(
    () => ({ ...variables, page: { index: pagination.pageIndex, size: pagination.pageSize } }),
    [pagination.pageIndex, pagination.pageSize, JSON.stringify(variables)]
  );
  const { data, error, loading } = useQuery(query, {
    variables: variablesWithPage,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    setInitialRequestData({ data, error, loading });
  }, [data, error, loading, setInitialRequestData]);

  const page = getPage(data, entity, sectionName, dataPath);
  const rows = page?.rows ?? [];
  const count = page?.count ?? 0;
  const mappedColumns = useMemo(() => mapTableColumnToTanstackColumns(columns), [columns]);
  const loadingColumns = useMemo(() => getLoadingColumns(mappedColumns), [mappedColumns]);
  const table = useReactTable({
    columns: loading ? loadingColumns : mappedColumns,
    data: loading ? Array.from({ length: pagination.pageSize }, () => ({})) : rows,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: setPagination,
    rowCount: count,
    state: { pagination },
  });

  const getWholeDataset = useCallback(async () => {
    const firstResult = await client.query({
      query,
      variables: { ...variables, page: { index: 0, size: downloaderChunkSize } },
      fetchPolicy: "no-cache",
    });
    const firstPage = getPage(firstResult.data, entity, sectionName, dataPath);
    const allRows = [...(firstPage?.rows ?? [])];
    const pageCount = Math.ceil((firstPage?.count ?? 0) / downloaderChunkSize);

    for (let index = 1; index < pageCount; index += 1) {
      const result = await client.query({
        query,
        variables: { ...variables, page: { index, size: downloaderChunkSize } },
        fetchPolicy: "no-cache",
      });
      allRows.push(...(getPage(result.data, entity, sectionName, dataPath)?.rows ?? []));
    }

    return allRows;
  }, [client, dataPath, entity, query, sectionName, variables]);

  function getCellData(cell: Record<string, unknown>): ReactNode {
    return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
  }

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "end", gap: 1 }}>
        {showColumnVisibilityControl && <OtTableColumnVisibility table={table} />}
        {dataDownloader && (
          <DataDownloader
            columns={dataDownloaderColumns || columns}
            fileStem={dataDownloaderFileStem}
            query={query.loc.source.body}
            rows={getWholeDataset}
            variables={{ ...variables, page: { index: 0, size: 10 } }}
          />
        )}
      </Box>
      <Box sx={{ overflowX: "auto", mt: 3 }}>
        <OtTableContainer>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <OtTH key={header.id} colSpan={header.colSpan} stickyColumn={header.column.columnDef.sticky}>
                    {header.isPlaceholder ? null : (
                      <OtTableHeader numeric={header.column.columnDef.numeric}>
                        <OtTableHeaderText sx={{ typography: "subtitle2" }}>
                          <Tooltip title={header.column.columnDef.tooltip} showHelpIcon={!!header.column.columnDef.tooltip}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </Tooltip>
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
              <OtTR key={row.id}>
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
      <Box sx={{ display: "flex", justifyContent: "end", alignItems: "center", py: 2 }}>
        {loading && <CircularProgress sx={{ mx: 2 }} size={25} />}
        <label htmlFor="offset-pagination-page-size">Rows per page:</label>
        <NativeSelect
          disableUnderline
          disabled={loading}
          id="offset-pagination-page-size"
          sx={{ pl: 2 }}
          value={pagination.pageSize}
          onChange={(event) => setPagination({ pageIndex: 0, pageSize: Number(event.target.value) })}
        >
          {[10, 25, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </NativeSelect>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, ml: 3 }}>
          <span>{getCurrentPagePosition(pagination.pageIndex, pagination.pageSize, count)}</span>
          <IconButton aria-label="first page" disabled={!table.getCanPreviousPage() || loading} onClick={() => table.setPageIndex(0)}>
            <FontAwesomeIcon size="2xs" icon={faBackwardStep} />
          </IconButton>
          <IconButton aria-label="previous page" disabled={!table.getCanPreviousPage() || loading} onClick={() => table.previousPage()}>
            <FontAwesomeIcon size="2xs" icon={faAngleLeft} />
          </IconButton>
          <IconButton aria-label="next page" disabled={!table.getCanNextPage() || loading} onClick={() => table.nextPage()}>
            <FontAwesomeIcon size="2xs" icon={faAngleRight} />
          </IconButton>
        </Box>
      </Box>
    </div>
  );
}

function getLoadingColumns(columns: Record<string, unknown>[]): Record<string, unknown>[] {
  return columns.map((column) =>
    isNestedColumns(column)
      ? {
          header: column.header || column.label,
          columns: getLoadingColumns(column.columns as Record<string, unknown>[]),
        }
      : { ...column, cell: () => <Skeleton sx={{ minWidth: "50px" }} variant="text" /> }
  );
}

function getPage(data: any, entity: string, sectionName: string, dataPath?: string) {
  return (dataPath ? dataPath.split(".") : [entity, sectionName]).reduce(
    (value, key) => value?.[key],
    data
  );
}

export default OtTableOffsetPagination;
