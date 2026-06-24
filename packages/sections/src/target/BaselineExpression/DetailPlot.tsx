import { Box, Typography } from "@mui/material";
import * as PlotLib from "@observablehq/plot";
import { nullishComparator } from "@ot/utils";
import { max, min } from "d3";
import { ObsPlot } from "ui";
import MedianTooltipTable from "./MedianTooltipTable";

function DetailPlot({
  data,
  show = "tissue", // "tissue" or "celltype"
}) {
  const height = 200;
  const barBackground = "#e7edf3";
  const barFill = "#91b8dd";

  if (data == null) return null;

  const sortedData = data.toSorted(
    nullishComparator(
      (a, b) => b - a,
      (a) => a.median
    )
  );

  const xAccessor = (d) => d[`${show}Biosample`].biosampleName;

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderStyle: "solid",
        borderColor: "grey.300",
        borderWidth: "1px",
        marginLeft: "80px",
        marginRight: "16px",
        marginBottom: "16px",
        paddingTop: 1.5,
        paddingLeft: "16px",
        paddingBottom: "16px",
      }}
    >
      <Typography variant="caption" component="div" sx={{ fontSize: "11px", mb: 1, ml: 0.4 }}>
        <strong>{show === "tissue" ? "Tissue" : "Cell Type"}</strong>
      </Typography>
      <ObsPlot
        data={sortedData}
        otherData={{ barBackground, barFill, xAccessor, show }}
        height={height}
        xTooltip={xAccessor}
        yTooltip={(d) => 1}
        xAnchorTooltip="adapt"
        yAnchorTooltip="bottom"
        renderChart={renderChart}
        renderTooltip={renderTooltip}
      />
    </Box>
  );
}

export default DetailPlot;

function renderChart({
  data,
  otherData: { barBackground, barFill, xAccessor, show },
  width,
  height,
}) {
  const maxMedian = max(data, (d) => d.median);

  const maxLabelChars = show === "tissue" ? 24 : 28;
  const truncateLabel = (s) => {
    return `${s.slice(0, maxLabelChars)}${s.length > maxLabelChars ? "..." : ""}`;
  };

  const barWidth = 23;
  const gapWidth = 6;
  const marginLeft = 0;
  const marginRight = show === "tissue" ? 95 : 130;
  const plotWidth = data.length * (barWidth + gapWidth) + marginLeft + marginRight;

  return PlotLib.plot({
    width: min([plotWidth, width]),
    height,
    marginLeft: marginLeft,
    marginRight: marginRight,
    marginTop: 0,
    marginBottom: show === "tissue" ? 115 : 140,
    style: { cursor: "default" },
    x: {
      axis: null,
      domain: data.map(xAccessor),
      paddingInner: gapWidth / (barWidth + gapWidth), // padding is ratio of gap to total space
      paddingOuter: 0,
    }, // preserve input order
    y: { axis: null, domain: [0, 1] },
    marks: [
      // text mark for x labels for more control and so can add tooltip
      PlotLib.text(data, {
        x: xAccessor,
        y: 0,
        text: (d) => truncateLabel(xAccessor(d)),
        textAnchor: "start",
        lineAnchor: "top",
        rotate: 40,
        fontSize: 11,
        dy: 4,
        className: "obs-tooltip",
      }),

      // background bars
      PlotLib.barY(data, {
        x: xAccessor,
        y: 1,
        fill: barBackground,
        className: "obs-tooltip",
        inset: 0,
      }),

      // median value bars
      PlotLib.barY(data, {
        x: xAccessor,
        y: (d) => d.median / maxMedian,
        fill: barFill,
        className: "obs-tooltip",
        inset: 0,
      }),
    ],
  });
}

function renderTooltip(datum, otherData) {
  return (
    <Box
      sx={{
        background: "#fff",
        borderColor: "#ddd",
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0.2rem",
        padding: "0.25em 0.5rem",
      }}
    >
      <MedianTooltipTable data={datum} show={otherData.show} showName />
    </Box>
  );
}
