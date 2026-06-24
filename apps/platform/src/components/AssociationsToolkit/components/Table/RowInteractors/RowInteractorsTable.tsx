import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  PaginationState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import useRowInteractors from "./useRowInteractors";
import { useAotfQueryState } from "../../../context/AssociationsQueryContext";
import TableBody from "../TableBody";
import {
  Box,
  InputLabel,
  NativeSelect,
  Skeleton,
  Typography,
  Slider,
  IconButton,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClose,
  faChevronLeft,
  faChevronRight,
  faBezierCurve,
} from "@fortawesome/free-solid-svg-icons";
import { styled } from "@mui/material/styles";
import { useState, useEffect, ReactElement } from "react";
import {
  FocusActionType,
  useAssociationsFocus,
  useAssociationsFocusDispatch,
} from "../../../context/AssociationsFocusContext";
import {
  ENTITIES,
  INTERACTORS_SOURCES,
  TABLE_PREFIX,
  InteractorsSource,
} from "../../../associationsUtils";
import { Tooltip, useApolloClient } from "ui";

type ThresholdState = number | null | undefined;

const INTERACTORS_SOURCE_LABEL = (
  assoc: number,
  interactors: number,
  source: InteractorsSource
): ReactElement => {
  const interactorTypeMap = {
    [INTERACTORS_SOURCES.REACTOME]: "pathway-based",
    [INTERACTORS_SOURCES.INTACT]: "binary physical",
    [INTERACTORS_SOURCES.STRING]: "functional",
    [INTERACTORS_SOURCES.SIGNOR]: "directional, causal",
  };

  const interactorType = interactorTypeMap[source];

  return (
    <>
      <b>{assoc}</b> target-disease association{assoc === 1 ? "" : "s"} found for{" "}
      <b>{interactors}</b> {interactorType} interactor{interactors === 1 ? "" : "s"}
    </>
  );
};

const btnStyles = {
  height: "45px",
  width: "35px",
  padding: "2px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 500ms",
};

const leftBTNStyles = {
  ...btnStyles,
  marginRight: 1,
};

const rightBTNStyles = {
  ...btnStyles,
  marginRight: 2,
  borderColor: grey[400],
  cursor: "pointer",
  "&:hover": {
    color: "#000",
  },
};

const OTSlider = styled(Slider)({
  color: grey[600],
  root: {
    padding: "0 10px !important",
  },
  mark: {
    backgroundColor: "#b8b8b8",
    height: 1,
  },
  ".MuiSlider-valueLabel": {
    bottom: "-60px",
    top: "none",
  },
  ".MuiSlider-valueLabel:before": {
    display: "none",
  },
});

function RowInteractorsTable({ row, columns, nameProperty, parentTable }) {
  const {
    id: diseaseId,
    sorting,
    enableIndirect,
    dataSourceControls: dataSourcesWeights,
    entityToGet,
  } = useAotfQueryState();
  const client = useApolloClient();

  const label = row.original.targetSymbol;

  const focusState = useAssociationsFocus();
  const dispatch = useAssociationsFocusDispatch();

  const focusElement = focusState.find(
    e => e.row === row.id && e.table === parentTable && e.interactors
  );

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [threshold, setThreshold] = useState<ThresholdState>(focusElement?.interactorsThreshold);

  const handleChange = (_: Event, newValue: number | number[]) => {
    setThreshold(newValue);
  };

  const onClickCloseInteractors = () => {
    dispatch({
      type: FocusActionType.SET_INTERACTORS_OFF,
      focus: { row: row.id, table: parentTable },
    });
  };

  const onInteractorsSourceChange = (newSource: InteractorsSource) => {
    dispatch({
      type: FocusActionType.SET_INTERACTORS_SOURCE,
      focus: { row: row.id, table: parentTable, source: newSource },
    });
  };

  const onInteractorsSourceThresholdChange = (newThreshold: InteractorsSource) => {
    dispatch({
      type: FocusActionType.SET_INTERACTORS_THRESHOLD,
      focus: { row: row.id, table: parentTable, interactorsThreshold: newThreshold },
    });
  };

  const { data, loading, interactorsMetadata } = useRowInteractors({
    client,
    options: {
      id: row.id,
      index: 0,
      size: 10,
      filter: "",
      source: focusElement?.interactorsSource,
      aggregationFilters: [],
      enableIndirect,
      datasources: dataSourcesWeights,
      rowsFilter: [],
      entityInteractors: null,
      entity: ENTITIES.DISEASE,
      diseaseId,
      sortBy: sorting[0].id,
      scoreThreshold: focusElement?.interactorsThreshold,
    },
  });

  useEffect(() => {
    setThreshold(focusElement?.interactorsThreshold);
  }, [focusElement]);

  const interactorsTable = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      loading,
      prefix: TABLE_PREFIX.INTERACTORS,
      parentTable,
      parentRow: row.id,
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    getRowId: row => row[entityToGet].id,
  });

  const cols = interactorsTable.getHeaderGroups()[0].headers[1].subHeaders;

  return (
    <Box
      data-testid={`interactors-table-${row.id}`}
      sx={{ pb: 2, background: grey[100], position: "relative" }}
    >
      <Box sx={{ position: "relative", pt: 2 }}>
        <Box
          data-testid="interactors-header"
          sx={{
            boxSizing: "border-box",
            alignItems: "center",
            display: "flex",
            borderColor: grey[400],
            position: "relative",
            mb: 2,
            ml: 3,
          }}
        >
          <Box sx={leftBTNStyles}>
            <FontAwesomeIcon icon={faBezierCurve} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
            <Typography data-testid="interactors-label" variant="controlHeader" sx={{ mr: 2 }}>
              Interactors for {label}
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} flex={1}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <InputLabel sx={{ fontSize: "0.85rem" }} htmlFor="intaractor_data_source">
                    Source:
                  </InputLabel>
                  <NativeSelect
                    id="intaractor_data_source"
                    data-testid="interactors-source-select"
                    onChange={e => {
                      onInteractorsSourceChange(e.target.value);
                    }}
                    variant="standard"
                    value={focusElement?.interactorsSource}
                    sx={{
                      fontSize: "0.85rem",
                      boxShadow: "none",
                      p: 0,
                      ".MuiNativeSelect-select": { border: 0 },
                    }}
                  >
                    <option value={INTERACTORS_SOURCES.REACTOME}>Reactome</option>
                    <option value={INTERACTORS_SOURCES.INTACT}>IntAct</option>
                    <option value={INTERACTORS_SOURCES.SIGNOR}>Signor</option>
                    <option value={INTERACTORS_SOURCES.STRING}>String</option>
                  </NativeSelect>
                </Box>
                <Box sx={{ display: "flex", ml: 1, alignItems: "center" }}>
                  {focusElement?.interactorsSource === INTERACTORS_SOURCES.STRING ||
                  focusElement?.interactorsSource === INTERACTORS_SOURCES.INTACT ? (
                    <>
                      <InputLabel sx={{ fontSize: "0.85rem" }} htmlFor="threshold_slider">
                        <Tooltip
                          title="Filter the list by data source interaction score. Our default cutoff is 0.42 for IntAct and 0.75 for String"
                          showHelpIcon
                        >
                          Interaction score
                        </Tooltip>
                        :{" "}
                        <Box
                          component="span"
                          data-testid="interactors-threshold-value"
                          sx={{ width: "30px", display: "inline-block" }}
                        >
                          {threshold}
                        </Box>
                      </InputLabel>
                      <Box width={75} sx={{ display: "flex", ml: 1 }}>
                        <OTSlider
                          id="threshold_slider"
                          data-testid="interactors-threshold-slider"
                          value={threshold}
                          onChange={handleChange}
                          onChangeCommitted={(_, newValue) =>
                            onInteractorsSourceThresholdChange(newValue)
                          }
                          aria-label="source threshold"
                          size="small"
                          min={0}
                          max={1.0}
                          step={0.01}
                          valueLabelDisplay="off"
                          disabled={
                            focusElement?.interactorsSource === INTERACTORS_SOURCES.SIGNOR ||
                            focusElement?.interactorsSource === INTERACTORS_SOURCES.REACTOME ||
                            loading
                          }
                        />
                      </Box>
                    </>
                  ) : (
                    <Box
                      data-testid="interactors-threshold-unavailable"
                      sx={{ width: "222px", height: "28px", display: "flex", alignItems: "center" }}
                    >
                      <Typography variant="caption">
                        Interaction score filter not available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              {loading ? (
                <Skeleton data-testid="interactors-loading" width={500} />
              ) : (
                <Typography data-testid="interactors-summary" variant="body2" sx={{ mr: 4 }}>
                  {INTERACTORS_SOURCE_LABEL(
                    data?.length,
                    interactorsMetadata?.count,
                    focusElement?.interactorsSource,
                    label
                  )}
                </Typography>
              )}
            </Box>
          </Box>
          <Tooltip title={`Close ${label} interactors`}>
            <Box
              data-testid="interactors-close-button"
              onClick={() => onClickCloseInteractors()}
              sx={rightBTNStyles}
            >
              <FontAwesomeIcon size="xl" icon={faClose} />
            </Box>
          </Tooltip>
        </Box>
      </Box>
      <Box data-testid="interactors-body">
        <TableBody noInteractors core={interactorsTable} cols={cols} />
        {data.length > 0 ? (
          <Box
            data-testid="interactors-pagination"
            sx={{ width: "100%", display: "flex", justifyContent: "end", mt: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography data-testid="interactors-pagination-info" variant="body2">
                <strong>
                  {interactorsTable.getState().pagination.pageIndex *
                    interactorsTable.getState().pagination.pageSize +
                    1}
                </strong>
                -
                <strong>
                  {Math.min(
                    (interactorsTable.getState().pagination.pageIndex + 1) *
                      interactorsTable.getState().pagination.pageSize,
                    data?.length || 0
                  )}
                </strong>{" "}
                of {data?.length || 0} target-disease associations
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mx: 3 }}>
                <IconButton
                  data-testid="interactors-previous-page"
                  disableRipple
                  onClick={() => interactorsTable.previousPage()}
                  disabled={!interactorsTable.getCanPreviousPage()}
                >
                  <FontAwesomeIcon icon={faChevronLeft} size="2xs" />
                </IconButton>
                <IconButton
                  data-testid="interactors-next-page"
                  disableRipple
                  onClick={() => interactorsTable.nextPage()}
                  disabled={!interactorsTable.getCanNextPage()}
                >
                  <FontAwesomeIcon icon={faChevronRight} size="2xs" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
export default RowInteractorsTable;
