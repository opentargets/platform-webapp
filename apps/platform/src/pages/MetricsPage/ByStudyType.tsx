import { Box, Paper, Typography, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type StudyTypeCount = { name: string; count: number };

function ByStudyType({ data, dataset, title }: { data: MetricRow[]; dataset: string; title: string }) {
  const theme = useTheme();
  const chartData: StudyTypeCount[] = data
    .filter((row) => row.dataset === dataset && row.kind === "grouping" && row.expression === "studyType" && row.group_value)
    .map((row) => ({ name: row.group_value, count: row.value }))
    .sort((a, b) => b.count - a.count);
  if (chartData.length === 0) return null;

  return <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined"><Box sx={{ minWidth: 0 }}>
    <Typography variant="subtitle2" sx={{ m: 0 }}>{title}</Typography>
    <ObsPlot data={chartData} otherData={{ textColor: theme.palette.text.primary }} minWidth={320} height={chartData.length * 23 + 8} renderChart={renderChart} xTooltip={(item) => item.count} yTooltip={(item) => item.name} xAnchorTooltip="adapt" yAnchorTooltip="adapt" gapInfo={0} renderInfo={() => null} />
  </Box></Paper>;

  function renderChart({ data, width, height }: { data: StudyTypeCount[]; width?: number; height: number }) {
    const plotWidth = Math.max((width ?? 0) - 210 - 24, 0);
    const maxCount = Math.max(...data.map((item) => item.count));
    const insideData = data.filter((item) => (item.count / maxCount) * plotWidth >= `${item.count.toLocaleString()}`.length * 7 + 12);
    const outsideData = data.filter((item) => !insideData.includes(item));
    return Plot.plot({ width: width ?? 0, height, style: { fontSize: "13.5px" }, marginTop: 4, marginBottom: 4, marginLeft: 240, marginRight: 0, x: { axis: null }, y: { domain: data.map((item) => item.name), label: null, tickSize: 0, tickPadding: 8, tickFormat: (label) => label.endsWith("qtl") ? `${label.slice(0, -3)}QTL` : label.toUpperCase() }, marks: [
      Plot.barX(data, { x: "count", y: "name", fill: theme.palette.primary.main, insetTop: 2, insetBottom: 2, className: "obs-tooltip" }),
      Plot.text(insideData, { x: "count", y: "name", text: (item) => item.count.toLocaleString(), textAnchor: "end", dx: -6, fill: "white", lineAnchor: "middle", fontSize: 12.5, className: "obs-tooltip" }),
      Plot.text(outsideData, { x: "count", y: "name", text: (item) => item.count.toLocaleString(), textAnchor: "start", dx: 6, fill: theme.palette.text.primary, lineAnchor: "middle", fontSize: 12.5, className: "obs-tooltip" }),
    ] });
  }
}

export default ByStudyType;
