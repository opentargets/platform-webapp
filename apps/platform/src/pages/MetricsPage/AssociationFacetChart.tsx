import { Box, Paper, Typography, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { ObsPlot } from "ui";
import dataSourcesAssoc from "../../components/AssociationsToolkit/static_datasets/dataSourcesAssoc";
import type { MetricRow } from "./MetricsPage";
import { grey } from "@mui/material/colors";


type FacetCount = { name: string; group: string; facet: string; count: number };

const dataSourceTypes = new Map(dataSourcesAssoc.map((source) => [source.id, source.aggregation]));
const FACETS = ["Target-disease evidence", "Indirect associations", "Direct associations"] as const;

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

function AssociationFacetChart({ data }: { data: MetricRow[] }) {
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

  const nameOrder = sources.map((source) => source.sourceId);
  const chartData: FacetCount[] = sources.flatMap((source) =>
    FACETS.map((facet) => ({
      name: source.sourceId,
      group: source.group,
      facet,
      count: bySource.get(source.sourceId)?.[facet] ?? 0,
    })),
  );

  if (chartData.length === 0) return null;

  return (
    <Paper sx={{ py: 2, px: 3, maxWidth: "100%", mt: 4 }} elevation={0} variant="outlined">
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
            height={nameOrder.length * 23 + 40}
            renderChart={renderChart}
            gapInfo={0}
            renderInfo={() => null}
          />
        </Box>
      </Box>
    </Paper>
  );

  function renderChart({ data, width, height }: { data: FacetCount[]; width?: number; height: number }) {
    const minCount = 100;
    const maxCount = Math.max(...data.map((item) => item.count));
    return Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 28,
      marginBottom: 24,
      marginLeft: 150,
      marginRight: 50,
      x: { type: "log", label: null, ticks: 4, tickFormat: "~s", tickSize: 0, domain: [minCount, 100000, maxCount] },
      y: {
        domain: nameOrder,
        label: null,
        tickSize: 0,
        tickPadding: 8,
        tickFormat: (name: string) => name.replaceAll("_", " "),
      },
      fx: { domain: FACETS, label: null, axis: "top", paddingInner: 0.25 },
      marks: [
        Plot.gridX({ ticks: 4, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.5 }),
        Plot.ruleY(data, { x1: minCount, x2: "count", y: "name", fx: "facet", stroke: theme.palette.primary.main, strokeWidth: 3}),
        Plot.dot(data, { x: "count", y: "name", fx: "facet", fill: theme.palette.primary.main, r: 4 }),
        Plot.text(data, {
          x: "count",
          y: "name",
          fx: "facet",
          text: (item: FacetCount) => item.count.toLocaleString(),
          dx: 10,
          textAnchor: "start",
          fontSize: 13,
          fill: grey[600],
        }),
        Plot.crosshairY(data, { x: "count", y: "name", fx: "facet" }),
        Plot.tip(
          data,
          Plot.pointerY({
            x: "count",
            y: "name",
            fx: "facet",
            title: (item: FacetCount) =>
              `${item.name.replaceAll("_", " ")}\n${item.facet}: ${item.count.toLocaleString()}`,
          }),
        ),
      ],
    });
  }
}

export default AssociationFacetChart;
