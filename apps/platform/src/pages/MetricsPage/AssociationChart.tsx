import { Box, Typography, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { schemeSet1, schemeTableau10, schemeDark2, schemePaired } from "d3";
import { ObsPlot } from "ui";
import dataSourcesAssoc from "../../components/AssociationsToolkit/static_datasets/dataSourcesAssoc";
import type { MetricRow } from "./MetricsPage";
import { grey } from "@mui/material/colors";


// const colorScheme = [...schemeSet1.slice(0, 5), ...schemeSet1.slice(6)];
// const colorScheme = schemeTableau10;
const colorScheme = schemeDark2;
// const colorScheme = schemePaired.slice(0, 2);

type FacetCount = { name: string; group: string; facet: string; count: number; y: number; color: string };

const dataSourceTypes = new Map(dataSourcesAssoc.map((source) => [source.id, source.aggregation]));
const FACETS = ["Target-disease evidence", "Indirect associations", "Direct associations"] as const;
const ROW_HEIGHT = 21;
const GROUP_LABEL_GAP = 1.5;
const BOTTOM_ROW_PADDING = 0.5;

function extractCounts(data: MetricRow[], facet: (typeof FACETS)[number]) {
  if (facet === "Target-disease evidence") {
    return data
      .filter((row) => row.dataset.startsWith("evidence_") && row.kind === "scalar" && row.metric === "count")
      .map((row) => ({ sourceId: row.dataset.replace("evidence_", ""), count: row.value }));
  }
  const dataset = facet === "Direct associations" ? "association_by_datasource_direct" : "association_by_datasource_indirect";
  return data
    .filter((row) => row.dataset === dataset && row.kind === "grouping" && row.group_value)
    .map((row) => ({ sourceId: row.group_value, count: row.value }));
}

function AssociationChart({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const bySource = new Map<string, Partial<Record<(typeof FACETS)[number], number>>>();
  FACETS.forEach((facet) => {
    extractCounts(data, facet).forEach(({ sourceId, count }) => {
      const counts = bySource.get(sourceId) ?? {};
      counts[facet] = count;
      bySource.set(sourceId, counts);
    });
  });

  const sources = [...bySource.entries()].map(([sourceId, counts]) => ({
    sourceId,
    group: dataSourceTypes.get(sourceId) ?? "Other",
    maxCount: Math.max(...FACETS.map((facet) => counts[facet] ?? 0)),
  }));

  const groupMaxCounts = new Map<string, number>();
  sources.forEach((source) => groupMaxCounts.set(source.group, Math.max(groupMaxCounts.get(source.group) ?? 0, source.maxCount)));
  sources.sort(
    (a, b) =>
      (groupMaxCounts.get(b.group) ?? 0) - (groupMaxCounts.get(a.group) ?? 0) ||
      a.group.localeCompare(b.group) ||
      b.maxCount - a.maxCount,
  );

  const sourcesByGroup = new Map<string, typeof sources>();
  sources.forEach((source) => {
    const groupSources = sourcesByGroup.get(source.group) ?? [];
    groupSources.push(source);
    sourcesByGroup.set(source.group, groupSources);
  });

  const groups = [...sourcesByGroup.entries()];
  const groupColorOrder = new Map(groups.map(([group], index) => [group, index]));
  const sourcePositions = new Map<string, number>();
  const groupLabelPositions: { label: string; y: number }[] = [];
  let yPosition = 0;
  groups.forEach(([group, groupSources], index) => {
    if (index > 0) yPosition += GROUP_LABEL_GAP;
    groupLabelPositions.push({ label: group, y: yPosition });
    groupSources.forEach((source) => {
      yPosition += 1;
      sourcePositions.set(source.sourceId, yPosition);
    });
  });

  const maxYPosition = yPosition;
  const toChartY = (position: number) => maxYPosition - position;
  const yTicks = [...sourcePositions.values()].map(toChartY);
  const yTickLabels = new Map(
    [...sourcePositions.entries()].map(([sourceId, position]) => [toChartY(position), sourceId.replaceAll("_", " ")]),
  );
  const groupLabels = groupLabelPositions.map(({ label, y }) => ({ label, y: toChartY(y), facet: FACETS[0] }));
  const chartData: FacetCount[] = sources.flatMap((source) =>
    FACETS.map((facet) => ({
      name: source.sourceId,
      group: source.group,
      facet,
      count: bySource.get(source.sourceId)?.[facet] ?? 0,
      y: toChartY(sourcePositions.get(source.sourceId) ?? 0),
      color: colorScheme[(groupColorOrder.get(source.group) ?? 0) % colorScheme.length],
    })),
  );

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ m: 0 }}>Association evidence coverage</Typography>
        <Box
          sx={{
            "& [aria-label='fx-axis tick label']": { fontWeight: 700, fontSize: "13px" },
            "& [aria-label='y-axis tick label']": { textTransform: "capitalize" },
            "& figure": { display: "flex", flexDirection: "column" },
            "& figure > svg": { order: 0 },
            "& figure > :not(svg)": { order: 1, marginTop: "36px" },
            mt: 3,
          }}
        >
          <ObsPlot
            data={chartData}
            minWidth={640}
            height={(maxYPosition + 1) * ROW_HEIGHT + 40}
            renderChart={renderChart}
            gapInfo={0}
            renderInfo={() => null}
          />
        </Box>
    </Box>
  );

  function renderChart({ data, width, height }: { data: FacetCount[]; width?: number; height: number }) {
    const minCount = 100;
    const maxCount = Math.max(...data.map((item) => item.count));
    return Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 28,
      marginBottom: 32,
      marginLeft: 150,
      marginRight: 50,
      x: { type: "log", label: null, ticks: 4, tickFormat: "~s", tickSize: 0, domain: [minCount, 100000, maxCount] },
      y: {
        type: "linear",
        domain: [-BOTTOM_ROW_PADDING, maxYPosition],
        label: null,
        tickSize: 0,
        tickPadding: 8,
        ticks: yTicks,
        tickFormat: (position: number) => yTickLabels.get(position) ?? "",
      },
      fx: { domain: FACETS, label: null, axis: "top", paddingInner: 0.25 },
      marks: [
        Plot.gridX({ ticks: 4, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.5 }),
        Plot.text(groupLabels, {
          x: minCount,
          y: "y",
          fx: "facet",
          text: "label",
          dx: -8,
          textAnchor: "end",
          fontSize: 13,
          fontWeight: 700,
          fill: theme.palette.text.primary,
        }),
        Plot.ruleY(data, { x1: minCount, x2: "count", y: "y", fx: "facet", stroke: "color", strokeWidth: 3}),
        Plot.dot(data, { x: "count", y: "y", fx: "facet", fill: "color", r: 4 }),
        Plot.text(data, {
          x: "count",
          y: "y",
          fx: "facet",
          text: (item: FacetCount) => item.count.toLocaleString(),
          dx: 10,
          textAnchor: "start",
          fontSize: 13,
          fill: grey[600],
        }),
        Plot.crosshairY(data, { x: "count", y: "y", fx: "facet" }),
        Plot.tip(
          data,
          Plot.pointerY({
            x: "count",
            y: "y",
            fx: "facet",
            title: (item: FacetCount) =>
              `${item.name.replaceAll("_", " ")}\n${item.facet}: ${item.count.toLocaleString()}`,
          }),
        ),
      ],
    });
  }
}

export default AssociationChart;
