import { Box, Typography, Paper, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { therapeuticAreas } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type TherapeuticAreaCount = {
  name: string;
  count: number;
  areas?: TherapeuticAreaCount[];
};

const count = (rows: MetricRow[], dataset: string) =>
  rows.find(
    (row) =>
      row.dataset === dataset &&
      row.kind === "scalar" &&
      row.metric === "count",
  )?.value ?? 0;

function DiseasesByTherapeuticArea({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  console.log(theme)
  const areas = data
    .filter(
      (row) =>
        row.dataset === "disease" &&
        row.kind === "grouping" &&
        row.metric === "therapeuticArea",
    )
    .map((row) => ({
      name: therapeuticAreas[row.group_value] ?? row.group_value,
      count: row.value,
    }));
  const total = count(data, "disease");
  const otherAreas = areas
    .filter((area) => area.count < total * 0.02)
    .sort((a, b) => b.count - a.count);
  const chartData: TherapeuticAreaCount[] = areas
    .filter((area) => area.count >= total * 0.02)
    .sort((a, b) => b.count - a.count);

  if (otherAreas.length > 0) {
    chartData.push({
      name: "Other",
      count: otherAreas.reduce((sum, area) => sum + area.count, 0),
      areas: otherAreas,
    });
  }

  if (chartData.length === 0) return null;

  return (
    <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined" >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          Diseases by therapeutic area
        </Typography>
        <ObsPlot
          data={chartData}
          otherData={{ textColor: theme.palette.text.primary }}
          minWidth={320}
          height={chartData.length * 23 + 8}
          renderChart={renderChart}
          xTooltip={(area) => area.count}
          yTooltip={(area) => area.name}
          xAnchorTooltip="adapt"
          yAnchorTooltip="adapt"
          renderTooltip={renderTooltip}
          gapInfo={0}
          renderInfo={() => null}
        />
      </Box>
      <Typography variant="caption" component="p" sx={{ textAlign: "right", fontStyle: "italic" }}>
        A disease can belong to more than one therapeutic area
      </Typography>
    </Paper>
  );

  function renderChart({
    data,
    otherData,
    width,
    height,
  }: {
    data: TherapeuticAreaCount[];
    otherData?: { textColor: string };
    width?: number;
    height: number;
  }) {
    const plotWidth = Math.max((width ?? 0) - 210 - 24, 0);
    const maxCount = Math.max(...data.map((area) => area.count));
    const countLabelWidth = (area: TherapeuticAreaCount) =>
      `${area.count.toLocaleString()}`.length * 7 + 12;
    const insideData = data.filter(
      (area) => (area.count / maxCount) * plotWidth >= countLabelWidth(area),
    );
    const outsideData = data.filter((area) => !insideData.includes(area));

    return Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 4,
      marginBottom: 4,
      marginLeft: 240,
      marginRight: 0,
      x: { axis: null },
      y: {
        domain: data.map((area) => area.name),
        label: null,
        tickSize: 0,
        tickPadding: 8,
        tickFormat: (name) => name,
      },
      marks: [
        Plot.barX(data, {
          x: "count",
          y: "name",
          // fill: (area) => (area.areas ? "#5b89b0" : "#1963a3"),
          fill: (area) => (area.areas ? theme.palette.primary.light : theme.palette.primary.main),
          insetTop: 2,
          insetBottom: 2,
          className: "obs-tooltip",
        }),
        Plot.text(insideData, {
          x: (area) => area.count,
          y: "name",
          text: (area) => area.count.toLocaleString(),
          textAnchor: "end",
          dx: -6,
          fill: "white",
          lineAnchor: "middle",
          fontSize: 12.5,
          pointerEvents: "none",
          className: "obs-tooltip",
        }),
        Plot.text(outsideData, {
          x: (area) => area.count,
          y: "name",
          text: (area) => area.count.toLocaleString(),
          textAnchor: "start",
          dx: 6,
          fill: otherData?.textColor ?? "currentColor",
          lineAnchor: "middle",
          fontSize: 12.5,
          pointerEvents: "none",
          className: "obs-tooltip",
        }),
      ],
    });
  }

}

function renderTooltip(area: TherapeuticAreaCount) {
  if (!area.areas) return null;

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 2,
        p: 1,
      }}
    >
      {area.areas.map((otherArea) => (
        <Typography key={otherArea.name} variant="body2">
          {otherArea.name}: {otherArea.count.toLocaleString()}
        </Typography>
      ))}
    </Box>
  );
}

export default DiseasesByTherapeuticArea;
