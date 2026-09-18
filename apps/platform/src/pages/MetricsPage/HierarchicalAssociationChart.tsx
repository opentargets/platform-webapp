import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import * as Plot from "@observablehq/plot";
import { ObsPlot } from "ui";
import { CATEGORICAL_SCHEME_BASE } from "@ot/constants";
import dataSourcesAssoc from "../../components/AssociationsToolkit/static_datasets/dataSourcesAssoc";
import type { MetricRow } from "./MetricsPage";

type FacetCount = { name: string; group: string; facet: string; count: number; color: string };

const colorScheme = CATEGORICAL_SCHEME_BASE;

const dataSourceTypes = new Map(dataSourcesAssoc.map((source) => [source.id, source.aggregation]));
const dataSourceLabels = new Map(dataSourcesAssoc.map((source) => [source.id, source.label]));
const dataSourceOrder = new Map(dataSourcesAssoc.map((source, index) => [source.id, index]));
const FACETS = ["Target-disease evidence", "Indirect associations", "Direct associations"] as const;
const DATATYPE_COLUMN_WIDTH = 170;
const CHART_EDGE_PADDING = 8;
const BRACKET_WIDTH = 8;
const LEADER_LINE_PADDING = 14;
const DATASOURCE_LABEL_HALF_HEIGHT = 7;
const BRACKET_VERTICAL_PADDING = 2;
const LABEL_TO_DECORATION_GAP = BRACKET_VERTICAL_PADDING + 2;

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

function HierarchicalAssociationChart({ data }: { data: MetricRow[] }) {
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
  }));

  sources.sort(
    (a, b) =>
      (dataSourceOrder.get(a.sourceId) ?? Number.MAX_SAFE_INTEGER) -
        (dataSourceOrder.get(b.sourceId) ?? Number.MAX_SAFE_INTEGER) || a.sourceId.localeCompare(b.sourceId),
  );

  const sourcesByGroup = new Map<string, typeof sources>();
  sources.forEach((source) => {
    const groupSources = sourcesByGroup.get(source.group) ?? [];
    groupSources.push(source);
    sourcesByGroup.set(source.group, groupSources);
  });

  const groups = [...sourcesByGroup.entries()];
  const groupColorOrder = new Map(groups.map(([group], index) => [group, index]));
  const nameOrder = sources.map((source) => source.sourceId);
  const chartData: FacetCount[] = sources.flatMap((source) =>
    FACETS.map((facet) => ({
      name: source.sourceId,
      group: source.group,
      facet,
      count: bySource.get(source.sourceId)?.[facet] ?? 0,
      color: colorScheme[(groupColorOrder.get(source.group) ?? 0) % colorScheme.length],
    })),
  );

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Association evidence coverage
      </Typography>
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
          onChartMounted={(chart) =>
            appendGroupDecorations({
              chart,
              groups,
              rowCount: nameOrder.length,
              labelColor: theme.palette.text.primary,
            })
          }
          gapInfo={0}
          renderInfo={() => null}
        />
      </Box>
    </Box>
  );

  function renderChart({ data, width, height }: { data: FacetCount[]; width?: number; height: number }) {
    const minCount = 100;
    const maxCount = Math.max(...data.map((item) => item.count));
    const xDomainMax = Math.max(100000, maxCount);
    const facetWidth = Math.max(((width ?? 0) - (150 + DATATYPE_COLUMN_WIDTH) - 50) / FACETS.length, 0);
    const plottedData = data.filter((item) => item.count >= minCount);
    const insideData = plottedData.filter(
      (item) =>
        ((Math.log(item.count) - Math.log(minCount)) / (Math.log(xDomainMax) - Math.log(minCount))) * facetWidth >=
        item.count.toLocaleString().length * 7 + 12,
    );
    const outsideData = plottedData.filter((item) => !insideData.includes(item));
    const chart = Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 28,
      marginBottom: 24,
      marginLeft: 150 + DATATYPE_COLUMN_WIDTH,
      marginRight: 50,
      x: { type: "log", label: null, ticks: 4, tickFormat: "~s", tickSize: 0, domain: [minCount, xDomainMax] },
      y: {
        domain: nameOrder,
        label: null,
        tickSize: 0,
        tickPadding: 8,
        tickFormat: (name: string) => dataSourceLabels.get(name) ?? name.replaceAll("_", " "),
      },
      fx: { domain: FACETS, label: null, axis: "top", paddingInner: 0.25 },
      marks: [
        Plot.gridX({ ticks: 4, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.9 }),
        Plot.barX(plottedData, { x1: minCount, x2: "count", y: "name", fx: "facet", fill: "color", insetTop: 3, insetBottom: 3 }),
        Plot.text(insideData, {
          x: "count",
          y: "name",
          fx: "facet",
          text: (item: FacetCount) => item.count.toLocaleString(),
          dx: -6,
          textAnchor: "end",
          lineAnchor: "middle",
          fontSize: 12.5,
          fill:   'white',
          fontWeight: 600,
        }),
        Plot.text(outsideData, {
          x: "count",
          y: "name",
          fx: "facet",
          text: (item: FacetCount) => item.count.toLocaleString(),
          dx: 6,
          textAnchor: "start",
          lineAnchor: "middle",
          fontSize: 12.5,
          fill: theme.palette.text.primary,
        }),
        Plot.crosshairY(data, { x: "count", y: "name", fx: "facet" }),
        Plot.tip(
          data,
          Plot.pointerY({
            x: "count",
            y: "name",
            fx: "facet",
            title: (item: FacetCount) =>
              `${dataSourceLabels.get(item.name) ?? item.name.replaceAll("_", " ")}\n${item.facet}: ${item.count.toLocaleString()}`,
          }),
        ),
      ],
    }) as SVGSVGElement;

    return chart;
  }
}

function appendGroupDecorations({
  chart,
  groups,
  rowCount,
  labelColor,
}: {
  chart: SVGSVGElement;
  groups: [string, { sourceId: string }[]][];
  rowCount: number;
  labelColor: string;
}) {
  const yLabels = [...chart.querySelectorAll<SVGTextElement>("[aria-label='y-axis tick label'] text")];
  if (yLabels.length !== rowCount) return;

  const chartBounds = chart.getBoundingClientRect();
  const chartWidth = Number(chart.getAttribute("width"));
  const chartHeight = Number(chart.getAttribute("height"));
  if (!chartBounds.width || !chartBounds.height || Number.isNaN(chartWidth) || Number.isNaN(chartHeight)) return;

  const labelBounds = yLabels.map((label) => label.getBoundingClientRect());
  const labelPositions = labelBounds.map((bounds) => ({
    x: ((bounds.left - chartBounds.left) * chartWidth) / chartBounds.width,
    y: ((bounds.top + bounds.height / 2 - chartBounds.top) * chartHeight) / chartBounds.height,
  }));

  const namespace = "http://www.w3.org/2000/svg";
  const bands = document.createElementNS(namespace, "g");
  const annotations = document.createElementNS(namespace, "g");
  const labelStart = (index: number) => labelPositions[index].x;
  const yPositions = labelPositions.map(({ y }) => y);
  const rowSpacing = yPositions.length > 1 ? yPositions[1] - yPositions[0] : 23;
  let groupStart = 0;

  groups.forEach(([group, groupSources]) => {
    const groupEnd = groupStart + groupSources.length - 1;
    const datasourceLabelStart = Math.min(
      ...Array.from({ length: groupSources.length }, (_, index) => labelStart(groupStart + index)),
    );
    const bracketX = datasourceLabelStart - LABEL_TO_DECORATION_GAP - BRACKET_WIDTH;
    const leaderEnd = groupSources.length === 1 ? datasourceLabelStart - LABEL_TO_DECORATION_GAP : bracketX;
    const leaderStart = datasourceLabelStart - BRACKET_WIDTH - LEADER_LINE_PADDING;
    const categoryLabelX = leaderStart - LABEL_TO_DECORATION_GAP;
    const top = groupStart === 0
      ? Math.max(CHART_EDGE_PADDING, yPositions[groupStart] - rowSpacing / 2)
      : (yPositions[groupStart - 1] + yPositions[groupStart]) / 2;
    const bottom = groupEnd === rowCount - 1
      ? Math.min(chartHeight - CHART_EDGE_PADDING, yPositions[groupEnd] + rowSpacing / 2)
      : (yPositions[groupEnd] + yPositions[groupEnd + 1]) / 2;
    const band = document.createElementNS(namespace, "rect");

    band.setAttribute("x", String(CHART_EDGE_PADDING));
    band.setAttribute("y", String(top));
    band.setAttribute("width", String(chartWidth - CHART_EDGE_PADDING * 2));
    band.setAttribute("height", String(bottom - top));
    band.setAttribute("fill", "transparent");
    bands.appendChild(band);

    const groupCenter = (yPositions[groupStart] + yPositions[groupEnd]) / 2;
    const label = document.createElementNS(namespace, "text");
    label.setAttribute("x", String(categoryLabelX));
    label.setAttribute("y", String(groupCenter));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "13");
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", labelColor);
    label.textContent = group;
    annotations.appendChild(label);

    const leader = document.createElementNS(namespace, "line");
    leader.setAttribute("x1", String(leaderStart));
    leader.setAttribute("x2", String(leaderEnd));
    leader.setAttribute("y1", String(groupCenter));
    leader.setAttribute("y2", String(groupCenter));
    leader.setAttribute("stroke", grey[500]);
    leader.setAttribute("stroke-width", "1");
    annotations.appendChild(leader);

    if (groupSources.length > 1) {
      const bracket = document.createElementNS(namespace, "path");
      bracket.setAttribute(
        "d",
        `M${bracketX + BRACKET_WIDTH},${yPositions[groupStart] - DATASOURCE_LABEL_HALF_HEIGHT - BRACKET_VERTICAL_PADDING}H${bracketX}V${yPositions[groupEnd] + DATASOURCE_LABEL_HALF_HEIGHT + BRACKET_VERTICAL_PADDING}H${bracketX + BRACKET_WIDTH}`,
      );
      bracket.setAttribute("fill", "none");
      bracket.setAttribute("stroke", grey[500]);
      bracket.setAttribute("stroke-width", "1");
      annotations.appendChild(bracket);
    }

    groupStart += groupSources.length;
  });

  chart.style.overflow = "visible";
  chart.insertBefore(bands, chart.firstChild);
  chart.appendChild(annotations);
}

export default HierarchicalAssociationChart;
