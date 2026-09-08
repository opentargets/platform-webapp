import { faCaretDown, faCaretRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Box, Collapse, styled, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import {
  getScale,
  isPartnerPreview,
  TABLE_PREFIX,
  tableCSSVariables,
} from "../../associationsUtils";
import { useAotfQueryState, useAotfQueryDispatch } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { useAotfData } from "../../context/AssociationsDataContext";
import dataSourcesCols from "../../static_datasets/dataSourcesAssoc";
import prioritizationCols from "../../static_datasets/prioritisationColumns";
import { ROW_METRICS } from "../../static_datasets/rowMetrics";
import { NoveltyGaugeCell } from "./MetricCells";
import HeaderControls from "../controls/HeaderControls";
import NameFilter from "../controls/NameFilter";
import AggregationsTooltip from "./AssocTooltip";
import CellName from "./CellName";
import TableBody from "./TableBody";
import TableCell from "./TableCell";
import TableFooter from "./TableFooter";
import TableHeader from "./TableHeader";

const TableElement = styled("main")({
  maxWidth: "1800px",
  margin: "0 auto",
});

const TableSpacer = styled("div")({
  marginBottom: 5,
});

const getIndicatorLabel = (prefix: string): string => {
  switch (prefix) {
    case TABLE_PREFIX.CORE:
      return "All";
    case TABLE_PREFIX.PINNING:
      return "Pinned";
    case TABLE_PREFIX.UPLOADED:
      return "Uploaded";
    default:
      return "";
  }
};

const getIndicatorCount = (
  prefix: string,
  count: number,
  filteredCount: number
): string | number => {
  switch (prefix) {
    case TABLE_PREFIX.CORE:
      return count;
    default:
      return `${filteredCount} of ${count}`;
  }
};

interface TableIndicatorControlProps {
  prefix?: string;
  open?: boolean;
  count?: number;
  filteredCount?: number;
  onClickToggle?: () => void;
  onClickDelete?: () => void;
}

const TableIndicatorControl = ({
  prefix = "",
  open = true,
  count = 0,
  filteredCount = 0,
  onClickToggle,
  onClickDelete,
}: TableIndicatorControlProps) => {
  const label = getIndicatorLabel(prefix);
  const countLabel = getIndicatorCount(prefix, count, filteredCount);
  return (
    <Box sx={{ display: "flex", my: 1, gap: 1, alignItems: "center" }}>
      {prefix !== TABLE_PREFIX.CORE && (
        <Box
          onClick={onClickDelete}
          sx={{ color: grey[600], cursor: "pointer" }}
          data-testid={`delete-${prefix.toLowerCase()}-button`}
        >
          <FontAwesomeIcon size="sm" icon={faTrash} />
        </Box>
      )}
      <Box
        onClick={onClickToggle}
        data-testid={`section-${prefix.toLowerCase()}`}
        sx={{
          ml: prefix === TABLE_PREFIX.CORE ? "20px" : 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: grey[300],
          width: "150px",
          px: "6px",
          borderRadius: "2px",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {`${label} (${countLabel})`}
        </Typography>
        <Box ml={1}>
          {open ? <FontAwesomeIcon icon={faCaretDown} /> : <FontAwesomeIcon icon={faCaretRight} />}
        </Box>
      </Box>
    </Box>
  );
};

const columnHelper = createColumnHelper<any>();

const evidenceViewColumns = getDatasources({
  displayedTable: "associations",
  colorScale: getScale(true),
});
const prioritisationViewColumns = getDatasources({
  displayedTable: "prioritisations",
  colorScale: getScale(false),
});

const CUSTOM_CELL_RENDERERS: Record<string, (cell: any) => React.ReactNode> = {
  noveltyIcon: cell => (
    <NoveltyGaugeCell
      value={cell.getValue()}
      row={cell.row.original}
      loading={cell.table.getState().loading}
      table={cell.table.getState().prefix}
    />
  ),
};

const metricsColumns = ROW_METRICS.filter(
  metric => !(metric.isPrivate && metric.isPrivate !== isPartnerPreview)
).map(metric =>
  columnHelper.accessor((row: any) => row[metric.id], {
    id: metric.id,
    enableSorting: metric.sortable,
    isPrivate: metric.isPrivate,
    docsLink: metric.docsLink,
    header: (
      <AggregationsTooltip title={metric.description} placement="right">
        <Typography
          variant="assoc_header"
          data-testid={`table-header-${metric.id}`}
        >
          {metric.label}
        </Typography>
      </AggregationsTooltip>
    ),
    cell: (cell: any) => {
      const customRenderer = CUSTOM_CELL_RENDERERS[metric.id];
      if (customRenderer) return customRenderer(cell);
      return (
        <Box sx={{ px: 1, overflow: "hidden" }}>
          {metric.format(cell.getValue())}
        </Box>
      );
    },
  })
);

function getDatasources({
  displayedTable,
  colorScale,
}: {
  displayedTable: string;
  colorScale: (v: number) => string;
}) {
  const isAssociations = displayedTable === "associations";
  const baseCols = isAssociations ? dataSourcesCols : prioritizationCols;
  const dataProp = isAssociations ? "dataSources" : "prioritisations";
  const datasources: any[] = [];
  baseCols.forEach(({ id, label, sectionId, description, aggregation, isPrivate, docsLink }: any) => {
    if (isPrivate && isPrivate !== isPartnerPreview) return;
    const column = columnHelper.accessor((row: any) => row[dataProp][id], {
      id,
      sectionId,
      enableSorting: isAssociations,
      aggregation,
      isPrivate,
      docsLink,
      header: isAssociations ? (
        <Typography variant="assoc_header" data-testid={`table-header-${id}`}>
          {label}
        </Typography>
      ) : (
        <AggregationsTooltip title={description} placement="right">
          <Box sx={{ cursor: "help" }}>
            <Typography variant="assoc_header" data-testid={`table-header-${id}`}>
              {label}
            </Typography>
          </Box>
        </AggregationsTooltip>
      ),
      cell: (cell: any) => (
        <TableCell cell={cell} colorScale={colorScale} displayedTable={displayedTable} />
      ),
    });
    datasources.push(column);
  });
  return datasources;
}

function TableAssociations() {
  const { entity, entityToGet, pagination, sorting } = useAotfQueryState();
  const { handlePaginationChange, handleSortingChange } = useAotfQueryDispatch();
  const {
    displayedTable,
    pinnedEntries,
    uploadedEntries,
    setPinnedEntries,
    setUploadedEntries,
  } = useAotfURLState();
  const {
    data,
    count,
    loading: associationsLoading,
    pinnedData,
    pinnedLoading,
    uploadedData,
    uploadedLoading,
  } = useAotfData();

  const rowNameEntity = entity === "target" ? "name" : "approvedSymbol";
  const isAssociations = displayedTable === "associations";
  const associationsColorScale = getScale(true);
  const [coreOpen, setCoreOpen] = useState(true);
  const [pinningOpen, setPinningOpen] = useState(true);
  const [uploadedOpen, setUploadedOpen] = useState(true);

  const columns = useMemo(
    () => [
      columnHelper.group({
        header: "header",
        id: "naiming-cols",
        columns: [
          columnHelper.accessor((row: any) => row[entityToGet][rowNameEntity], {
            id: "name",
            enableSorting: false,
            cell: (cell: any) => <CellName cell={cell} colorScale={associationsColorScale} />,
            header: () => {
              const label = entityToGet === "target" ? "Target" : "Disease";
              return (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexDirection: "column",
                    pr: 2,
                  }}
                >
                  <Typography data-testid="table-header-name" variant="assoc_header">
                    {label}
                  </Typography>
                  <NameFilter />
                </Box>
              );
            },
          }),
          columnHelper.accessor((row: any) => row.score, {
            id: "score",
            header: (
              <Typography variant="assoc_header" data-testid="table-header-score">
                Association Score
              </Typography>
            ),
            cell: (cell: any) => (
              <Box sx={{ marginRight: "10px" }}>
                <TableCell
                  shape="rectangular"
                  colorScale={associationsColorScale}
                  cell={cell}
                />
              </Box>
            ),
          }),
        ],
      }),
      columnHelper.group({
        header: "entities",
        id: "entity-cols",
        columns: isAssociations ? evidenceViewColumns : prioritisationViewColumns,
      }),
      ...(isAssociations && metricsColumns.length > 0
        ? [
            columnHelper.group({
              header: "",
              id: "metrics-cols",
              columns: metricsColumns,
            }),
          ]
        : []),
    ],
    [displayedTable, entityToGet, rowNameEntity]
  );

  const coreAssociationsTable = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      prefix: TABLE_PREFIX.CORE,
      loading: associationsLoading,
    } as any,
    pageCount: count,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row[entityToGet].id,
    manualPagination: true,
    manualSorting: true,
  });

  const corePinnedTable = useReactTable({
    data: pinnedData,
    columns,
    state: {
      pagination: { pageIndex: 0, pageSize: 150 },
      sorting,
      prefix: TABLE_PREFIX.PINNING,
      loading: pinnedLoading,
    } as any,
    pageCount: count,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row[entityToGet].id,
    manualPagination: true,
    manualSorting: true,
  });

  const coreUploadedTable = useReactTable({
    data: uploadedData,
    columns,
    state: {
      pagination: { pageIndex: 0, pageSize: 150 },
      sorting,
      prefix: TABLE_PREFIX.UPLOADED,
      loading: uploadedLoading,
    } as any,
    pageCount: count,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row[entityToGet].id,
    manualPagination: true,
    manualSorting: true,
  });

  useEffect(() => {
    if (uploadedEntries.length > 0) {
      setCoreOpen(false);
      setUploadedOpen(true);
    }
    if (uploadedEntries.length === 0) {
      setCoreOpen(true);
    }
  }, [uploadedEntries]);

  useEffect(() => {
    if (pinnedData.length === 0 && uploadedData.length === 0) {
      setCoreOpen(true);
    }
  }, [pinnedData, uploadedData]);

  const entitesHeaders = coreAssociationsTable.getHeaderGroups()[0].headers[1].subHeaders;

  return (
    <div className="TAssociations" style={tableCSSVariables} data-testid="associations-table">
      <TableElement>
        <TableHeader table={coreAssociationsTable} cols={entitesHeaders} />

        <HeaderControls cols={entitesHeaders} />

        <TableSpacer />

        {pinnedEntries.length > 0 && (
          <TableIndicatorControl
            prefix={TABLE_PREFIX.PINNING}
            count={pinnedEntries.length}
            filteredCount={corePinnedTable.getRowCount()}
            open={pinningOpen}
            onClickToggle={() => setPinningOpen(!pinningOpen)}
            onClickDelete={() => setPinnedEntries([])}
          />
        )}
        {pinnedData.length > 0 && pinnedEntries.length > 0 && (
          <Collapse in={pinningOpen}>
            <TableBody core={corePinnedTable} cols={entitesHeaders} />
          </Collapse>
        )}

        {uploadedEntries.length > 0 && (
          <TableIndicatorControl
            prefix={TABLE_PREFIX.UPLOADED}
            count={uploadedEntries.length}
            filteredCount={coreUploadedTable.getRowCount()}
            open={uploadedOpen}
            onClickToggle={() => setUploadedOpen(!uploadedOpen)}
            onClickDelete={() => setUploadedEntries([])}
          />
        )}
        {coreUploadedTable.getRowCount() > 0 && uploadedEntries.length > 0 && (
          <Collapse in={uploadedOpen}>
            <TableBody core={coreUploadedTable} cols={entitesHeaders} />
          </Collapse>
        )}

        {(uploadedEntries.length > 0 || pinnedEntries.length > 0) && (
          <TableIndicatorControl
            prefix={TABLE_PREFIX.CORE}
            count={count}
            open={coreOpen}
            onClickToggle={() => setCoreOpen(!coreOpen)}
          />
        )}

        {coreOpen && <TableBody core={coreAssociationsTable} cols={entitesHeaders} />}

        <TableFooter table={coreAssociationsTable} coreOpen={coreOpen} />
      </TableElement>
    </div>
  );
}

export default TableAssociations;
