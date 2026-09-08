import { useCallback, useState } from "react";
import { hsl, scaleLinear } from "d3";
import { ObsPlot, DataDownloader, Link } from "../../index";
import { Box, Typography, Popover, Dialog, Checkbox, FormControlLabel } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownWideShort, faChevronRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import { renderWaterfallPlot } from "./renderWaterfallPlot";
import HeatmapLegend from "./HeatmapLegend";
import { grey } from "@mui/material/colors";
import {
  waterfallMaxWidth,
  waterfallMargins,
  waterfallMaxCanvasWidth,
  featureToGroup,
  groupNames,
} from "./constants";
import { getGroupResults, computeWaterfall, getColorInterpolator } from "./helpers";

const FONT_SIZE = 13.5;
const COMPACT_FONT_SIZE = 12.6;
const CELL_Y_PADDING = 1.4;
const COMPACT_CELL_Y_PADDING = 1.1;

function THead({ children, singleRowMode }: { children: React.ReactNode; singleRowMode: boolean }) {
  const compact = singleRowMode;
  const disabledGeneColumn = singleRowMode;
  const disabledScoreColumn = singleRowMode;
  return (
    <thead>
      <Box component="tr">
        {!disabledGeneColumn && <th></th>}
        {!disabledScoreColumn && <th></th>}
        <th></th>
        <th></th>
        <Box
          component="th"
          colSpan="3"
          sx={{ borderBottom: `1px solid ${grey[600]}`, paddingBottom: 1 }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontSize: (compact ? COMPACT_FONT_SIZE : FONT_SIZE) + 0.5 }}
          >
            Colocalisation
          </Typography>
        </Box>
        <th></th>
        <th></th>
        <th></th>
      </Box>
      <tr>{children}</tr>
    </thead>
  );
}

function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

function BodyRow({ row, colorInterpolator, data, singleRowMode }: { row: any; colorInterpolator: any; data: any; singleRowMode: boolean }) {
  const compact = singleRowMode;
  const disabledGeneColumn = singleRowMode;
  const disabledScoreColumn = singleRowMode;
  const [over, setOver] = useState(false);

  const { row: waterfallRow, xDomain: waterfallXDomain } = computeWaterfall(
    data.rows.find(d => d.target.id === row.targetId)
  );

  function handleMouseEnter(event) {
    setOver(true);
  }

  function handleMouseLeave(event) {
    setOver(false);
  }

  const cellWrapperProps = {
    handleMouseEnter: handleMouseEnter,
    handleMouseLeave: handleMouseLeave,
  };

  return (
    <Box
      component="tr"
      sx={{
        "& td": {
          bgcolor: !singleRowMode && over ? grey[100] : "transparent",
        },
      }}
    >
      {!disabledGeneColumn &&
        <CellWrapper {...cellWrapperProps}>
          <GeneCell value={row.targetSymbol} targetId={row.targetId} />
        </CellWrapper>
      }
      {!disabledScoreColumn &&
        <CellWrapper {...cellWrapperProps}>
          <ScoreCell value={row.score.toFixed(3)} />
        </CellWrapper>
      }
      {groupNames.map(groupName => (
        <CellWrapper key={groupName} {...cellWrapperProps}>
          <HeatCell
            value={row[groupName]?.toFixed(3)}
            groupName={groupName}
            bgrd={colorInterpolator(row[groupName])}
            mouseLeaveRow={handleMouseLeave}
            waterfallRow={waterfallRow}
            waterfallXDomain={waterfallXDomain}
            compact={compact}
          />
        </CellWrapper>
      ))}
      <CellWrapper {...cellWrapperProps}>
        <BaseCell value={row.shapBaseValue.toFixed(3)} compact={compact} />
      </CellWrapper>
      {!singleRowMode && (
        <CellWrapper {...cellWrapperProps}>
          <DetailCell
            geneSymbol={row.targetSymbol}
            score={row.score.toFixed(3)}
            mouseLeaveRow={handleMouseLeave}
            waterfallRow={waterfallRow}
            waterfallXDomain={waterfallXDomain}
            over={over}
          />
        </CellWrapper>
      )}
    </Box>
  );
}

function CellWrapper({ handleMouseEnter, handleMouseLeave, children }) {
  return (
    <Box component="td" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} p={0.5}>
      {children}
    </Box>
  );
}

function HeaderCell({ value, textAlign, singleRowMode }: { value: string; textAlign: string; singleRowMode: boolean }) {
  const compact = singleRowMode;
  return (
    <Box component="th" pt={1}>
      <Typography
        variant="subtitle2"
        sx={{ fontSize: (compact ? COMPACT_FONT_SIZE : FONT_SIZE) + 0.5 }}
        textAlign={textAlign}
      >
        {value}{" "}
        {value == "Score" && (
          <span style={{ color: grey[500] }}>
            <FontAwesomeIcon size="sm" icon={faArrowDownWideShort} />
          </span>
        )}
      </Typography>
    </Box>
  );
}

function GeneCell({ value, targetId }) {
  return (
    <Box display="flex" justifyContent="end">
      <Link asyncTooltip to={`/target/${targetId}`}>
        <Typography variant="body2">{value}</Typography>
      </Link>
    </Box>
  );
}

function ScoreCell({ value }) {
  return (
    <Box display="flex" justifyContent="center" borderRadius={1.5}>
      <Typography variant="body2" sx={{ pointerEvents: "none" }}>
        {value}
      </Typography>
    </Box>
  );
}

function HeatCell({ value, bgrd, groupName, mouseLeaveRow, waterfallRow, waterfallXDomain, compact }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [plotProps, setPlotProps] = useState(null);

  const open = Boolean(anchorEl);
  const id = open ? "plot-popover" : undefined;

  function handleClick(event) {
    const filteredWaterfallRow = structuredClone(waterfallRow);
    filteredWaterfallRow.features = filteredWaterfallRow.features.filter(d => {
      return featureToGroup[d.name] === groupName;
    });
    let { row, xDomain } = computeWaterfall(filteredWaterfallRow, waterfallXDomain, true);
    if (xDomain.some(Number.isNaN)) {
      // all Shapley values are zero
      const fullExtent = waterfallXDomain[1] - waterfallXDomain[0];
      xDomain = scaleLinear()
        .domain([-fullExtent / 8, fullExtent / 8])
        .nice()
        .domain();
    }
    const plotWidth =
      waterfallMargins.left +
      waterfallMargins.right +
      (waterfallMaxCanvasWidth * (xDomain[1] - xDomain[0])) /
        (waterfallXDomain[1] - waterfallXDomain[0]);
    let xTicks;
    const xRange = xDomain[1] - xDomain[0];
    if (xDomain.includes(0)) xTicks = xDomain;
    else if (Math.abs(xDomain[0]) < xRange / 4) xTicks = [0, xDomain[1]];
    else if (Math.abs(xDomain[1]) < xRange / 4) xTicks = [xDomain[0], 0];
    else xTicks = [...xDomain, 0];
    setPlotProps({
      data: row,
      otherData: { margins: waterfallMargins, xDomain, xTicks },
      minWidth: plotWidth,
      maxWidth: plotWidth,
      renderChart: renderWaterfallPlot,
    });
    setAnchorEl(event.currentTarget);
  }

  function handleClose(event) {
    setAnchorEl(null);
    setPlotProps(null);
    mouseLeaveRow();
  }

  return (
    <>
      <Box
        aria-describedby={id}
        bgcolor={bgrd}
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderRadius={1.5}
        py={compact ? COMPACT_CELL_Y_PADDING : CELL_Y_PADDING}
        onClick={handleClick}
        sx={{
          outline: anchorEl ? "2px solid #000" : "none",
          "&:hover": {
            outline: `2px solid ${grey[600]}`,
            cursor: "pointer",
          },
        }}
      >
        <Typography
          fontSize={compact ? COMPACT_FONT_SIZE : FONT_SIZE}
          sx={{
            color: hsl(bgrd).l < 0.6 ? "#fff" : "#000",
            pointerEvents: "none",
          }}
        >
          {value}
        </Typography>
      </Box>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        elevation={1}
        disableScrollLock
        transitionDuration={0}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        sx={{
          mt: 0.5,
        }}
      >
        <ClosePlot handleClose={handleClose} />
        <Box sx={{ px: 3, pt: 3.5, pb: 2 }}>
          <ObsPlot {...plotProps} />
        </Box>
      </Popover>
    </>
  );
}

function BaseCell({ value, compact }) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      borderRadius={1.5}
      py={compact ? COMPACT_CELL_Y_PADDING : CELL_Y_PADDING }
      outline={`1px solid ${grey[400]}`}
    >
      <Typography fontSize={compact ? COMPACT_FONT_SIZE : FONT_SIZE} color={grey[500]}>
        {value}
      </Typography>
    </Box>
  );
}

function DetailCell({ geneSymbol, score, mouseLeaveRow, waterfallRow, waterfallXDomain, over }) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    mouseLeaveRow();
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderRadius={1.5}
        sx={{ opacity: over ? 1 : 0, transition: "all ease 100ms" }}
      >
        <Box
          sx={{
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0.5,
            padding: 1,
            borderRadius: "0.4em",
            "&:hover": {
              backgroundColor: "#fff",
            },
          }}
          onClick={handleClickOpen}
        >
          <Typography variant="caption">Details</Typography>
          <FontAwesomeIcon size="sm" icon={faChevronRight} />
        </Box>
      </Box>
      <Dialog maxWidth="md" open={open} onClose={handleClose}>
        <ClosePlot handleClose={handleClose} />
        <Box p={3}>
          <Typography variant="h6">
            {geneSymbol},{" "}
            <Box component="span" fontSize="0.9em">
              score: {score}
            </Box>
          </Typography>
          <ObsPlot
            data={waterfallRow}
            otherData={{ margins: waterfallMargins, xDomain: waterfallXDomain, labelBase: true }}
            minWidth={waterfallMaxWidth}
            maxWidth={waterfallMaxWidth}
            renderChart={renderWaterfallPlot}
          />
        </Box>
      </Dialog>
    </>
  );
}

function ClosePlot({ handleClose }) {
  return (
    <Box
      onClick={handleClose}
      width="36px"
      height="36px"
      position="absolute"
      top={0}
      right={0}
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{
        "&:hover": {
          bgcolor: grey[100],
        },
      }}
    >
      <FontAwesomeIcon icon={faXmark} />
    </Box>
  );
}

function ChartControls({ rows, query, variables, columns }) {
  return (
    <Box
      sx={{
        borderColor: grey[300],
        borderRadius: 1,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
        mb: 2,
      }}
    >
      <DataDownloader
        btnLabel="Export"
        rows={rows}
        query={query}
        variables={variables}
        columns={columns}
      />
    </Box>
  );
}

function HeatmapTable({
  query,
  data,
  variables,
  loading,
  fixedGene,
  disabledFilter = false,  // only relevant if fixedGene is provided
  disabledExport = false,
  disabledLegend = false,
  singleRowMode = false,
}) {
  const disabledGeneColumn = singleRowMode;
  const disabledScoreColumn = singleRowMode;
  const [showAll, setShowAll] = useState(!fixedGene);
  const [defaultChecked] = useState(true);

  const getVisData = useCallback(
    ({ all }) => {
      if (showAll) return all;
      return all.filter(row => row.targetId === fixedGene);
    },
    [showAll]
  );

  if (loading) return <></>;

  const groupResults = getGroupResults(data.rows);
  const colorInterpolator = getColorInterpolator(groupResults);
  const twoElementDomain = [colorInterpolator.domain()[0], colorInterpolator.domain()[2]];

  const rows = getVisData({ all: groupResults });

  const columns = [
    { id: "targetSymbol", label: "gene" },
    { id: "score" },
    { id: "Distance" },
    { id: "VEP" },
    { id: "eQTL" },
    { id: "pQTL" },
    { id: "sQTL" },
    { id: "E2G" },
    { id: "Other" },
    { id: "shapBaseValue", label: "base" },
  ];

  return (
    <>
      {fixedGene && !disabledFilter && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1, mr: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                title="All"
                checked={groupResults.length === 1 ? defaultChecked : showAll}
                disabled={groupResults.length === 1 ? defaultChecked : false}
                onChange={() => {
                  setShowAll(!showAll);
                }}
              ></Checkbox>
            }
            label={
              <Typography variant="body2">
                {groupResults.length === 1 ? "Showing" : "Show"} all prioritised targets in credible
                set
              </Typography>
            }
          />
        </Box>
      )}
      {!disabledExport && (
        <ChartControls query={query} rows={rows} variables={variables} columns={columns} />
      )}
      <Box display="flex" justifyContent="center">
        <Box
          component="table"
          sx={{
            tableLayout: "fixed",
            width: singleRowMode ? "100%" : "90%",
            borderCollapse: "collapse",
            sx: {
              maxWidth: "1000px",
              my: singleRowMode ? 0 : 4,
            },
          }}
        >
          {!disabledLegend && (
            <Box component="caption" sx={{ mt: 3, captionSide: "bottom", textAlign: "left" }}>
              <HeatmapLegend
                legendOptions={{
                  color: {
                    type: "diverging",
                    interpolate: colorInterpolator,
                    domain: twoElementDomain,
                    range: twoElementDomain,
                  },
                }}
              />
            </Box>
          )}
          <THead singleRowMode={singleRowMode}>
            {[
                ...(disabledGeneColumn ? [] : ["Gene"]),
                ...(disabledScoreColumn ? [] : ["Score"]),
                ...groupNames, "Base",
                ...(singleRowMode ? [] : [""]),
              ].map((value, index) => (
              <HeaderCell
                key={index}
                value={value}
                textAlign={value === "Gene" ? "right" : "center"}
                singleRowMode={singleRowMode}
              />
            ))}
          </THead>
          <TBody>
            {rows.map(row => (
              <BodyRow
                data={data}
                key={row.targetId}
                row={row}
                colorInterpolator={colorInterpolator}
                singleRowMode={singleRowMode}
              />
            ))}
          </TBody>
        </Box>
      </Box>
    </>
  );
}

export default HeatmapTable;
