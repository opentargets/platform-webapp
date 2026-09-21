import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import * as Plot from "@observablehq/plot";
import { scaleLog } from "d3";
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
const FACET_PADDING_INNER = 0.22;
const COUNT_LABEL_CHARACTER_WIDTH = 7;
const COUNT_LABEL_LEFT_PADDING = 6;
const COUNT_LABEL_RIGHT_INSET = 6;

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
      <Box
        sx={{
          "& [aria-label='fx-axis tick label']": { fontWeight: 700, fontSize: "13px" },
          "& [aria-label='y-axis tick label']": { textTransform: "capitalize" },
          "& figure": { display: "flex", flexDirection: "column" },
          "& figure > svg": { order: 0 },
          "& figure > :not(svg)": { order: 1, marginTop: "36px" },
          my: 2,
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
    const plotWidth = Math.max((width ?? 0) - (150 + DATATYPE_COLUMN_WIDTH) - 16, 0);
    const facetWidth = (plotWidth * (1 - FACET_PADDING_INNER)) / (FACETS.length - FACET_PADDING_INNER);
    const plottedData = data.filter((item) => item.count >= minCount);
    const insideData = plottedData.filter(
      (item) =>
        ((Math.log(item.count) - Math.log(minCount)) / (Math.log(xDomainMax) - Math.log(minCount))) * facetWidth >=
        item.count.toLocaleString().length * COUNT_LABEL_CHARACTER_WIDTH +
          COUNT_LABEL_LEFT_PADDING +
          COUNT_LABEL_RIGHT_INSET,
    );
    const outsideData = plottedData.filter((item) => !insideData.includes(item));
    const xTicks = scaleLog().domain([minCount, xDomainMax]).ticks(4);
    const xAxisMarks =
      (width ?? 0) < theme.breakpoints.values.lg
        ? [
            Plot.axisX(xTicks.filter((_, index) => index % 2 === 0), { tickSize: 0, tickPadding: 3, tickFormat: "~s" }),
            Plot.axisX(xTicks.filter((_, index) => index % 2 === 1), {
              stroke: grey[300],
              strokeOpacity: 0.9,
              tickSize: 12,
              tickPadding: 4,
              tickFormat: "~s",
            }),
          ]
        : [];
    const chart = Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 28,
      marginBottom: 24,
      marginLeft: 150 + DATATYPE_COLUMN_WIDTH,
      marginRight: 16,
      x: {
        type: "log",
        label: null,
        axis: (width ?? 0) < theme.breakpoints.values.lg ? null : "bottom",
        ticks: 4,
        tickFormat: "~s",
        tickSize: 0,
        domain: [minCount, xDomainMax],
      },
      y: {
        domain: nameOrder,
        label: null,
        tickSize: 0,
        tickPadding: 8,
        tickFormat: (name: string) => dataSourceLabels.get(name) ?? name.replaceAll("_", " "),
      },
      fx: { domain: FACETS, label: null, axis: "top", paddingInner: FACET_PADDING_INNER },
      marks: [
        ...xAxisMarks,
        Plot.gridX({ ticks: 4, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.9 }),
        Plot.barX(plottedData, { x1: minCount, x2: "count", y: "name", fx: "facet", fill: "color", insetTop: 3, insetBottom: 3 }),
        Plot.text(insideData, {
          x: "count",
          y: "name",
          fx: "facet",
          text: (item: FacetCount) => item.count.toLocaleString(),
          dx: -COUNT_LABEL_RIGHT_INSET,
          textAnchor: "end",
          lineAnchor: "middle",
          fontSize: 12.5,
          fill:   'white',
          fontWeight: 500,
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
  const rowBackgrounds = document.createElementNS(namespace, "g");
  const rowHoverTargets = document.createElementNS(namespace, "g");
  const annotations = document.createElementNS(namespace, "g");
  const labelStart = (index: number) => labelPositions[index].x;
  const yPositions = labelPositions.map(({ y }) => y);
  const rowSpacing = yPositions.length > 1 ? yPositions[1] - yPositions[0] : 23;
  const rowBounds = yPositions.map((position, index) => ({
    top: index === 0 ? Math.max(CHART_EDGE_PADDING, position - rowSpacing / 2) : (yPositions[index - 1] + position) / 2,
    bottom:
      index === rowCount - 1
        ? Math.min(chartHeight - CHART_EDGE_PADDING, position + rowSpacing / 2)
        : (position + yPositions[index + 1]) / 2,
  }));
  const rowBackgroundRects = rowBounds.map(({ top, bottom }) => {
    const rect = document.createElementNS(namespace, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", String(top));
    rect.setAttribute("width", String(chartWidth));
    rect.setAttribute("height", String(bottom - top));
    rect.setAttribute("fill", "transparent");
    rowBackgrounds.appendChild(rect);
    return rect;
  });
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

  let highlightedRow = -1;
  const setHighlightedRow = (rowIndex: number) => {
    if (rowIndex === highlightedRow) return;
    if (highlightedRow !== -1) rowBackgroundRects[highlightedRow].setAttribute("fill", "transparent");
    if (rowIndex !== -1) rowBackgroundRects[rowIndex].setAttribute("fill", grey[200]);
    highlightedRow = rowIndex;
  };

  rowBounds.forEach(({ top, bottom }, index) => {
    const target = document.createElementNS(namespace, "rect");
    target.setAttribute("x", "0");
    target.setAttribute("y", String(top));
    target.setAttribute("width", String(chartWidth));
    target.setAttribute("height", String(bottom - top));
    target.setAttribute("fill", "transparent");
    target.setAttribute("pointer-events", "all");
    target.addEventListener("pointerenter", () => setHighlightedRow(index));
    target.addEventListener("pointerleave", () => setHighlightedRow(-1));
    rowHoverTargets.appendChild(target);
  });
  chart.style.overflow = "visible";
  chart.insertBefore(rowBackgrounds, chart.firstChild);
  chart.appendChild(annotations);
  chart.appendChild(rowHoverTargets);
}

export default HierarchicalAssociationChart;
