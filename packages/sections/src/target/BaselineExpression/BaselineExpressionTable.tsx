import { faSquareCaretUp } from "@fortawesome/free-regular-svg-icons";
import { faCaretDown, faCaretUp, faCircle, faSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { green, grey } from "@mui/material/colors";
import type { Theme } from "@mui/material/styles";
import { makeStyles } from "@mui/styles";
import { theme } from "@ot/config";
import { naLabel, baselineUnits } from "@ot/constants";
import { sentenceCase, formatSignificantDigits } from "@ot/utils";

import { type RankingInfo, rankItem } from "@tanstack/match-sorter-utils";
import {
  createColumnHelper,
  type ExpandedState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, ScientificNotation, Tooltip } from "ui";
import MedianTooltipTable from "./MedianTooltipTable";
import SpecificityTooltipTable from "./SpecificityTooltipTable";
import DetailPlot from "./DetailPlot";

const emptyColor = "#d1dae6";
const specificityColors = {
  high: green[500],
  low: emptyColor,
};

const specificityCircleWidth = "12px";

const datatypeNameLookup = {
  "scrna-seq": "Single-cell RNA-seq",
  "bulk rna-seq": "Bulk RNA-seq",
  "mass-spectrometry proteomics": "MS proteomics",
};

// Declare module for TanStack Table
declare module "@tanstack/table-core" {
  interface FilterFns {
    searchFilterFn: FilterFn<unknown>;
  }

  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

function getSortingFn(datatype, allDatatypes) {
  return (rowA, rowB) => {
    const a = rowA.original;
    const b = rowB.original;
    const otherDatatypes = new Set(allDatatypes);
    otherDatatypes.delete(datatype);
    const orderedDatatypes = [datatype, ...otherDatatypes];
    for (const dt of orderedDatatypes) {
      let aMedian = a[dt]?.median;
      let bMedian = b[dt]?.median;
      if (aMedian === undefined && bMedian === undefined) continue;
      if (aMedian === null) aMedian = -1;
      else if (aMedian === undefined) aMedian = -2;
      if (bMedian === null) bMedian = -1;
      else if (bMedian === undefined) bMedian = -2;
      return aMedian - bMedian;
    }
    return 0;
  };
}

// Search filter function
const searchFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  const allRowValuesInString = JSON.stringify(row.original);
  const containsSubstr = new RegExp(value, "i").test(allRowValuesInString);

  addMeta({
    itemRank,
  });

  return itemRank.passed || containsSubstr;
};

function isTopRow(cellcontext) {
  return cellcontext.row.id === cellcontext.table.getRowModel().rows[0]?.id;
}

interface BaselineExpressionDataRow {
  tissueBiosample?: {
    biosampleId: string;
    biosampleName: string;
  };
  tissueBiosampleParent?: {
    biosampleId: string;
    biosampleName: string;
  };
  tissueBiosampleFromSource?: string;
  celltypeBiosample?: {
    biosampleId: string;
    biosampleName: string;
  };
  celltypeBiosampleParent?: {
    biosampleId: string;
    biosampleName: string;
  };
  celltypeBiosampleFromSource?: string;
  median: number;
  datasourceId: string;
  datatypeId: string;
  specificity_score?: number;
  unit: string;
  _firstLevelName?: string;
  _firstLevelId?: string;
  _secondLevelMedianName?: string;
  _secondLevelMedianId?: string;
  _secondLevelSpecificityName?: string;
  _secondLevelSpecificityId?: string;
}

type BaselineExpressionTableRow = {
  [K in (typeof datatypes)[number]]: BaselineExpressionDataRow;
};

interface BaselineExpressionTableProps {
  symbol: string;
  data: any;
  datatypes: string[];
  DownloaderComponent?: React.ReactNode;
  specificityThreshold: number;
  viewMode: "tissue" | "celltype";
  expandSpecificity: boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
  tableContainer: {
    marginTop: theme.spacing(1),
  },
  mainTable: {
    tableLayout: "fixed",
    width: "100%",
    maxWidth: "1420px",
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: "0.75rem",
  },
  tissueCell: {
    fontWeight: "bold",
    fontSize: "0.75rem",
  },
  medianCell: {
    textAlign: "center",
    fontSize: "0.75rem",
  },
  barContainer: {
    height: "12px",
    backgroundColor: emptyColor,
    position: "relative",
    width: "100%",
    margin: "2px 0",
  },
  failed: {
    backgroundColor: theme.palette.grey[300],
    fontSize: "8.5px",
  },
  bar: {
    height: "100%",
    backgroundColor: theme.palette.primary.dark,
    transition: "width 0.3s ease",
    pointerEvents: "none",
  },
  childBar: {
    height: "100%",
    backgroundColor: theme.palette.primary.main,
    transition: "width 0.3s ease",
    pointerEvents: "none",
  },
  groupRow: {
    cursor: "pointer",
  },
  nestedRow: {
    cursor: "pointer",
  },
  cursorAuto: {
    cursor: "auto !important",
  },
  expandButton: {
    padding: "2px",
    minWidth: "24px",
    height: "24px",
  },
  expandColumn: {
    width: "24px",
  },
}));

const Legend = ({
  specificityThreshold,
  groupByTissue,
  symbol,
}: {
  specificityThreshold: number;
  groupByTissue: boolean;
  symbol: string;
}) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 4, mr: 6 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: "12px" }}>
          <Tooltip
            showHelpIcon
            title={
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="caption">
                  Specificity score threshold: {100 * specificityThreshold}%
                </Typography>
                <Typography variant="caption">
                  A high value indicates <strong>{symbol}</strong> is in the top{" "}
                  {100 * (1 - specificityThreshold)}% of specifically
                  expressed genes in the {groupByTissue ? "tissue" : "cell type"}.
                </Typography>
              </Box>
            }
          >
            Specificity
          </Tooltip>
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <FontAwesomeIcon
            icon={faCircle}
            fontSize={specificityCircleWidth}
            color={specificityColors.high}
          />
          <Typography variant="caption">high</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <FontAwesomeIcon
            icon={faCircle}
            fontSize={specificityCircleWidth}
            color={specificityColors.low}
          />
          <Typography variant="caption">low</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: "12px" }}>
          <Tooltip
            showHelpIcon
            title={
              <Typography variant="caption">Median expression normalised within columns</Typography>
            }
          >
            Median expression
          </Tooltip>
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <FontAwesomeIcon
            icon={faSquare}
            fontSize={specificityCircleWidth}
            color={theme.palette.secondary.main}
          />
        </Box>
      </Box>
    </Box>
  );
};

function XAxis({ datatype, maxMedian }) {
  const displayMax = formatSignificantDigits(maxMedian);
  return (
    <Box 
      className="xaxis-component"
      sx={{
        position: "absolute",
        top: 0,
        mt: -4,
        left: "1.5rem",
        right: "3.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "end",
        height: "fit-content",
        cursor: "auto",
        pointerEvents: "auto",
        zIndex: 1,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            height: "1.25em",
            overflow: "visible",
            pb: 0.25,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "inline-block",
              verticalAlign: "bottom",
              lineHeight: 1,
              cursor: "default",
              fontSize: { md: "11px", lg: "12px" }
            }}>
            0 {baselineUnits[datatype]}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "inline-block",
              verticalAlign: "bottom",
              lineHeight: 1,
              cursor: "default",
              fontSize: { md: "11px", lg: "12px" }
            }}
          >
            {displayMax.toLowerCase().includes("e")
              ? <ScientificNotation number={maxMedian} dp={1} />
              : displayMax
            }
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            height: "4px",
            borderWidth: "0 1px 1px",
            borderColor: "#999",
            borderStyle: "solid",
          }}
        />
      </Box>
    </Box>
  );
}

const columnHelper = createColumnHelper<BaselineExpressionTableRow>();

function ViewToggleButton({ value, view, hasSpecific }) {
  return (
    <Tooltip
      title={
        <Typography variant="caption">
          {hasSpecific
            ? `At least one ${view} has a high specificity score`
            : `No ${view}s have a high specificify score`}
        </Typography>
      }
      placement="top-start"
    >
      <ToggleButton
        value={value}
        aria-label={view}
        sx={{ border: `1px solid transparent` }} // prevents jumping on change
      >
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            alignItems: "center",
          }}
        >
          <Box sx={{ fontSize: "13px" }}>{sentenceCase(view)}</Box>
          <Box
            sx={{
              width: specificityCircleWidth,
              height: specificityCircleWidth,
              bgcolor: specificityColors[hasSpecific ? "high" : "low"],
              border: hasSpecific ? "none" : `1px solid ${grey[400]}`,
              borderRadius: "6px",
            }}
          />
        </Box>
      </ToggleButton>
    </Tooltip>
  );
}

const BaselineExpressionTable: React.FC<BaselineExpressionTableProps> = ({
  symbol,
  data,
  datatypes,
  DownloaderComponent,
  specificityThreshold,
  viewMode = "tissue",
  expandSpecificity = false
}) => {

  const classes = useStyles();
  const [sorting, setSorting] = useState<SortingState>([{ id: datatypes[0], desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [groupByTissue, setGroupByTissue] = useState(viewMode === 'tissue');
  // const [searchTerm, setSearchTerm] = useState("");

  const handleExpandedChange = useCallback(
    (updaterOrValue: ExpandedState | ((old: ExpandedState) => ExpandedState)) => {
      setExpanded((old) => {
        const newExpanded =
          typeof updaterOrValue === "function" ? updaterOrValue(old) : updaterOrValue;

        // Check if any first-level row was collapsed
        const collapsedFirstLevelIds = Object.keys(old).filter(
          (id) => !id.includes(".") && old[id] === true && newExpanded[id] !== true
        );

        // For each collapsed first-level row, close all its child second-level rows
        const result = { ...newExpanded };
        collapsedFirstLevelIds.forEach((parentId) => {
          Object.keys(result).forEach((id) => {
            if (id.startsWith(parentId + ".")) {
              result[id] = false;
            }
          });
        });

        return result;
      });
    },
    []
  );

  const { firstLevel, secondLevel, thirdLevel, maxMedians } = data[groupByTissue ? "tissue" : "celltype"];

  // Handler to collapse all expanded rows
  const handleCollapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  const getRowCanExpand = useCallback(
    (row) => {
      return row.original._firstLevelId || thirdLevel[row.original._secondLevelId];
    },
    [firstLevel, secondLevel, thirdLevel]
  );

  const getSubRows = useCallback(
    (row) => {
      return secondLevel[row._firstLevelId] ?? [];
    },
    [firstLevel, secondLevel]
  );

  const getName = useCallback(
    (obj) => {
      let dataRow;
      for (const datatype of datatypes) {
        dataRow = obj[datatype];
        if (dataRow) break;
      }
      return dataRow._secondLevelName ?? dataRow._firstLevelName;
    },
    [groupByTissue]
  );

  const getColumnWidth = (index) => {
    return index === 0 ? "30%" : `${70 / datatypes.length}%`;
  };

  const columns = [
    columnHelper.accessor((row) => getName(row), {
      id: "name",
      header: (
        <Box
          component="span"
          sx={{ 
            width: "100%", 
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "flex-start",
            lineHeight: 1.5
          }}
        >
          <Tooltip
            title={
              <Box onClick={(event) => event.stopPropagation}>
                Mapped to{" "}
                <Link
                  external
                  to={
                    groupByTissue
                      ? "https://www.ebi.ac.uk/ols4/ontologies/uberon"
                      : "https://www.ebi.ac.uk/ols4/ontologies/cl"
                  }
                >
                  {groupByTissue ? "Uber-anatomy ontology (UBERON)" : "Cell Ontology (CL)"}
                </Link>
              </Box>
            }
            showHelpIcon
          >
              {groupByTissue ? "Tissue" : "Cell Type"}
          </Tooltip>
        </Box>
      ),
      cell: (cellContext) => {
        const isFirstLevel = cellContext.row.original._firstLevelId;
        const name = cellContext.getValue();
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: isFirstLevel ? null : 5,
            }}
          >
            {isFirstLevel && (
              <IconButton
                disableRipple
                className={classes.expandButton}
                sx={{
                  visibility: cellContext.row.getCanExpand() ? "visible" : "hidden", // keeps all rows same height
                }}
              >
                {cellContext.row.getIsExpanded() ? (
                  <FontAwesomeIcon icon={faCaretUp} size="xs" />
                ) : (
                  <FontAwesomeIcon icon={faCaretDown} size="xs" />
                )}
              </IconButton>
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: isFirstLevel ? "600" : "500",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Tooltip
                title={name}
                placement="top"
                slotProps={{
                  popper: {
                    sx: { pointerEvents: "none" },
                    modifiers: [
                      {
                        name: "offset",
                        options: {
                          offset: [-20, -8],
                        },
                      },
                    ],
                  },
                }}
              >
                {name}
              </Tooltip>
            </Typography>
          </Box>
        );
      },
    }),
  ];

  for (const datatype of datatypes) {
    // empty column
    if (!groupByTissue && datatype === "mass-spectrometry proteomics") {
      columns.push(
        columnHelper.accessor(() => {}, {
          header: "",
          accessorKey: datatype,
          enableSorting: false,
        })
      );
    } else {
      columns.push(
        // use -1 for missing value to make sorting work
        columnHelper.accessor(
          (row) => {
            const value = row[datatype]?._normalisedMedian;
            if (value === null) return -1;
            if (value === undefined) return -2;
            return value;
          },
          {
            accessorKey: datatype,
            header: <Box sx={{ pb: 4.5, lineHeight: 1.5 }}>{datatypeNameLookup[datatype] ?? datatype}</Box>,
            enableSorting: true,
            sortingFn: getSortingFn(datatype, datatypes),
            cell: (cellContext) => {
              const isFirstLevel = cellContext.row.original._firstLevelId;
              const isSecondLevel = !isFirstLevel && cellContext.row.depth === 1;
              const value = cellContext.getValue();

              const slotProps = {
                popper: {
                  sx: { pointerEvents: "none" },
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [-3, -10],
                      },
                    },
                  ],
                },
                tooltip: {
                  sx: {
                    maxWidth: 550,
                  },
                },
              };
              const DisplayXAxis = isTopRow(cellContext) && maxMedians[datatype] > 0 && (
                <XAxis datatype={datatype} maxMedian={maxMedians[datatype]} />
              );

              if (value === -1) {
                return (
                  <>
                    {DisplayXAxis}
                    <Tooltip
                      placement="top-start"
                      slotProps={slotProps}
                      title={
                        datatype === "mass-spectrometry proteomics"
                          ? "No protein detected in the measured tissue sample"
                          : null
                      }
                    >
                      <Box className={classes.medianCell}>
                        <Box className={`${classes.barContainer} ${classes.failed}`}>{naLabel}</Box>
                      </Box>
                    </Tooltip>
                  </>
                );
              }

              if (value === -2) return (                
                <>
                  {DisplayXAxis}
                  <Box className={classes.medianCell}></Box>
                </>
              );

              const percent = value >= 0 ? value * 100 : 0;
              const specificityScore = cellContext.row.original[datatype].specificity_score;

              return (
                <>
                  {DisplayXAxis}
                  <Box className={classes.medianCell}>
                    <Box className={classes.barContainer}>
                    <Tooltip
                      placement="top-start"
                      slotProps={slotProps}
                      title={
                        <MedianTooltipTable
                          data={cellContext.row.original[datatype]}
                          show={groupByTissue ? "tissue" : "celltype"}
                          showSource={isSecondLevel && datatype !== datatypes[0]}
                          subname={isFirstLevel
                            ? cellContext.row.original[datatype]._secondLevelMedianName
                            : undefined}
                        />
                      }
                    >
                      <Box
                        className={isFirstLevel ? classes.bar : classes.childBar}
                        style={{ width: `${percent}%` }}
                      />
                    </Tooltip>

                      {specificityScore != null && (
                        <Box
                          sx={{
                            position: "absolute",
                            right: -18,
                            top: 0,
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          <Tooltip
                            placement="top-start"
                            slotProps={slotProps}
                            title={
                              <SpecificityTooltipTable
                                data={cellContext.row.original[datatype]}
                                show={groupByTissue ? "tissue" : "celltype"}
                                specificityThreshold={specificityThreshold}
                                symbol={symbol}
                                subname={isFirstLevel
                                  ? cellContext.row.original[datatype]._secondLevelSpecificityName
                                  : undefined}
                              />
                            }
                          >
                            <FontAwesomeIcon
                              icon={faCircle}
                              fontSize={specificityCircleWidth}
                              color={
                                specificityColors[
                                  specificityScore >= specificityThreshold ? "high" : "low"
                                ]
                              }
                            />
                          </Tooltip>
                        </Box>
                      )}

                      {isSecondLevel && datatype === datatypes[0] && (
                        <Box
                          sx={{
                            position: "absolute",
                            left: -22,
                            top: -6,
                          }}
                        >
                          <IconButton
                            size="small"
                            disableRipple
                            className={classes.expandColumn}
                            sx={{
                              visibility: cellContext.row.getCanExpand() ? "visible" : "hidden",
                              "&:hover": {
                                bgcolor: "transparent",
                              },
                            }} // keeps all rows same height
                          >
                            {cellContext.row.getIsExpanded() ? (
                              <FontAwesomeIcon icon={faCaretUp} size="xs" />
                            ) : (
                              <FontAwesomeIcon icon={faCaretDown} size="xs" />
                            )}
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </>
              );
            },
          }
        )
      );
    }
  }

  // create table instance
  const table = useReactTable({
    data: firstLevel,
    columns,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getSubRows,
    onSortingChange: setSorting,
    onExpandedChange: handleExpandedChange,
    state: {
      sorting,
      pagination,
      expanded,
    },
    onPaginationChange: setPagination,
    getPaginationRowModel: getPaginationRowModel(),
    paginateExpandedRows: false, // This prevents child rows from being paginated
    manualPagination: false,
    // filterFns: {
    //   searchFilterFn: searchFilter,
    // },
  });

  useEffect(() => {
    table.setSorting([
      {
        id: firstLevel._maxSpecificity?.datatype ?? datatypes[0],
        desc: true,
      },
    ]);
  }, [table, firstLevel]);

  useEffect(() => {
    setExpanded({});
  }, [groupByTissue]);

  // Auto-expand the row with highest specificity
  useEffect(() => {
    if (
      expandSpecificity &&
      firstLevel._maxSpecificity?.score !== undefined &&
      firstLevel._maxSpecificity.score >= specificityThreshold &&
      firstLevel._maxSpecificity._firstLevelId
    ) {
      const targetRow = table.getRowModel().rows.find(
        (row) => row.original._firstLevelId === firstLevel._maxSpecificity._firstLevelId
      );
      
      if (targetRow) {
        setExpanded((prev: ExpandedState) => ({
          ...prev,
          [targetRow.id]: true,
        }));
      }
    }
  }, []); // only auto expand when first loads

  return (
    <Box className={classes.tableContainer}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          width: "100%",
          mb: 2,
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            columnGap: 4,
            rowGap: 2,
            flexWrap: "wrap",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ToggleButtonGroup
              value={groupByTissue ? "tissue" : "celltype"}
              aria-label="toggle view"
              exclusive
              onChange={(_, newValue) => {
                if (newValue == null) return;
                setGroupByTissue(newValue === "tissue");
              }}
            >
              <ViewToggleButton
                value="tissue"
                view="tissue"
                hasSpecific={data.tissue.firstLevel._maxSpecificity.score >= specificityThreshold}
                specificityThreshold={specificityThreshold}
              />
              <ViewToggleButton
                value="celltype"
                view="cell type"
                hasSpecific={data.celltype.firstLevel._maxSpecificity.score >= specificityThreshold}
                specificityThreshold={specificityThreshold}
              />
            </ToggleButtonGroup>
            <Legend
              specificityThreshold={specificityThreshold}
              groupByTissue={groupByTissue}
              symbol={symbol}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{DownloaderComponent}</Box>
        </Box>
      </Box>
      <Grid justifyContent="center" container>
        <Grid item xs={12} md={10}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" className={classes.mainTable} style={{ fontSize: "0.75rem" }}>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => {
                      return (
                        <TableCell
                          key={header.id}
                          className={classes.headerCell}
                          sx={{
                            width: getColumnWidth(index),
                            border: "none",
                            verticalAlign: index === 0 ? "bottom" : "top",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: index === 0 ? "flex-end" : "flex-start",
                              justifyContent: "space-between",
                              px: 1,
                            }}
                          >
                            <Box
                              sx={{
                                cursor: header.column.getCanSort() ? "pointer" : "default",
                                flex: 1,
                                display: "flex",
                                alignItems: index === 0 ? "flex-end" : "flex-start",
                              }}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {header.isPlaceholder ? null : (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: index === 0 ? "flex-end" : "flex-start",
                                    justifyContent: "flex-start",
                                    flex: 1,
                                    minWidth: 0,
                                    gap: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: "bold",
                                      lineHeight: 1,
                                      whiteSpace: index === 0 ? "nowrap" : "normal",
                                      overflow: index === 0 ? "hidden" : undefined,
                                      textOverflow: index === 0 ? "ellipsis" : undefined,
                                    }}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </Typography>
                                  {header.column.getCanSort() && (
                                    <TableSortLabel
                                      active={!!header.column.getIsSorted()}
                                      direction={
                                        header.column.getIsSorted() === "asc" ? "asc" : "desc"
                                      }
                                    />
                                  )}
                                </Box>
                              )}
                            </Box>
                            {index === 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  px: 1,
                                  py: "2px",
                                  backgroundColor: "grey.100",
                                  borderColor: "grey.400",
                                  visibility:
                                    Object.keys(expanded).filter((key) => !key.includes("."))
                                      .length === 0
                                      ? "hidden"
                                      : "visible",
                                  cursor: "pointer",
                                }}
                                onClick={handleCollapseAll}
                              >
                                <FontAwesomeIcon icon={faSquareCaretUp} color="grey.400" />
                                <Typography
                                  variant="caption"
                                  sx={{ fontSize: "11px", fontWeight: "600" }}
                                >
                                  Collapse all
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>

              <TableBody>
                {table.getRowModel().rows.map((row, rowIndex) => {
                  const isFirstLevel = row.original._firstLevelId;
                  const _isSecondLevel = row.depth === 1;

                  const isExpanded = row.getIsExpanded();
                  const allRows = table.getRowModel().rows;
                  // find next row that isn't a 3rd-level (DetailPlot is rendered as a depth>1 row)
                  let nextIdx = rowIndex + 1;
                  while (nextIdx < allRows.length && allRows[nextIdx].depth > 1) nextIdx++;
                  const nextRow = allRows[nextIdx];
                  // last 2nd-level in group when next visible row is a top-level row (depth 0) or end of table
                  const isLastSecondLevel = _isSecondLevel && (!nextRow || nextRow.depth === 0);

                  return (
                    <Fragment key={row.id}>
                      {/* 1st and 2nd level rows */}
                      <TableRow
                        className={`${isFirstLevel ? classes.groupRow : classes.nestedRow} ${row.getCanExpand() ? "" : classes.cursorAuto}`}
                        onClick={() => {
                          if (row.getCanExpand()) row.toggleExpanded();
                        }}
                        sx={
                          isFirstLevel && !isExpanded
                            ? {
                                "&:hover:not(:has(.xaxis-component:hover))": {
                                  cursor: row.getCanExpand() ? "pointer" : "auto",
                                  "& > td": {
                                    backgroundColor: `${theme.palette.grey[200]} !important`,
                                  },
                                },
                              }
                            : _isSecondLevel
                            ? {
                                "&:hover": {
                                  cursor: row.getCanExpand() ? "pointer" : "auto",
                                  "& > td:not(.single-cell-column)": {
                                    backgroundColor: `${theme.palette.grey[200]} !important`,
                                  },
                                },
                              }
                            : {
                                "&:hover:not(:has(.xaxis-component:hover))": {
                                  outlineOffset: "-1px",
                                  outline: "solid 1px",
                                  outlineColor: "grey.400",
                                },
                                ...(row.getCanExpand() && {
                                  "&:hover:not(:has(.xaxis-component:hover))": {
                                    outlineOffset: "-1px",
                                    outline: isFirstLevel || !isExpanded ? "solid 1px" : "none",
                                    outlineColor: "grey.400",
                                    cursor: "pointer",
                                  },
                                }),
                              }
                        }
                      >
                        {row.getVisibleCells().map((cell, index) => {
                          const isSingleCellColumn =
                            _isSecondLevel && isExpanded && cell.column.id === datatypes[0];
                          const isFirstCell = index === 0;
                          const isLastCell = index === row.getVisibleCells().length - 1;
                          const isGroupExpanded = isFirstLevel && isExpanded;
                          const inExpandedGroup = isGroupExpanded || _isSecondLevel;
                          return (
                            <TableCell
                              sx={{
                                position: "relative",
                                height: "24px",
                                width: getColumnWidth(index),
                                border: "none",
                                pl: index === 0 ? 5 : 3,
                                pr: index === 0 ? 3 : 7,
                                py: 0,
                                backgroundColor: isSingleCellColumn ? "#fff" : _isSecondLevel ? "grey.50" : (isFirstLevel && isExpanded) ? "grey.200" : null,
                                borderStyle: "solid",
                                borderColor: "grey.400",
                                borderTopWidth: isGroupExpanded ? "1px" : 0,
                                borderBottomWidth: _isSecondLevel && isLastSecondLevel && !isExpanded ? "1px" : 0,
                                borderLeftWidth: inExpandedGroup && isFirstCell ? "1px" : 0,
                                borderRightWidth: inExpandedGroup && isLastCell ? "1px" : 0,
                                boxShadow: isSingleCellColumn
                                  ? `inset 0 1px 0 ${grey[300]}, inset 1px 0 0 ${grey[300]}, inset -1px 0 0 ${grey[300]}`
                                  : undefined,
                              }}
                              className={isSingleCellColumn ? "single-cell-column" : undefined}
                              key={cell.id}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* 3rd level rows */}
                      {row.getIsExpanded() && row.original._secondLevelId && (
                        <TableRow sx={{ "& > *": { marginBottom: 5 } }}>
                          <TableCell
                            colSpan={table.getVisibleLeafColumns().length}
                            sx={{
                              p: 0,
                              position: "relative",
                              backgroundColor: "grey.50",
                              borderStyle: "solid",
                              borderColor: "grey.400",
                              borderTopWidth: 0,
                              borderBottomWidth: isLastSecondLevel ? "1px" : 0,
                              borderLeftWidth: "1px",
                              borderRightWidth: "1px",
                            }}
                            key={row.id}
                          >
                            <DetailPlot
                              data={thirdLevel[row.original._secondLevelId]}
                              show={groupByTissue ? "celltype" : "tissue"}
                            />
                            {/* gap covering plot's top border below the 2nd-level single-cell column */}
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: "30%",
                                width: `${70 / datatypes.length}%`,
                                height: "1px",
                                backgroundColor: "#fff",
                                pointerEvents: "none",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BaselineExpressionTable;
