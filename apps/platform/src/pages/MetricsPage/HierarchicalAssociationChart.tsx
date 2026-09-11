import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import * as Plot from "@observablehq/plot";
import { schemeDark2, schemeCategory10, schemeSet1, schemeTableau10 } from "d3";
import { ObsPlot } from "ui";
import dataSourcesAssoc from "../../components/AssociationsToolkit/static_datasets/dataSourcesAssoc";
import type { MetricRow } from "./MetricsPage";

type FacetCount = { name: string; group: string; facet: string; count: number; color: string };

// const colorScheme = schemeDark2;
// const colorScheme = schemeTableau10
// const colorScheme = schemeCategory10;
// const colorScheme = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7"];
const colorScheme = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];
// const colorScheme = schemeDark2;

const dataSourceTypes = new Map(dataSourcesAssoc.map((source) => [source.id, source.aggregation]));
const FACETS = ["Target-disease evidence", "Indirect associations", "Direct associations"] as const;
const DATATYPE_COLUMN_WIDTH = 170;
const CHART_EDGE_PADDING = 8;
const DATATYPE_LABEL_X = 150;
const LEADER_LINE_START = DATATYPE_LABEL_X + 10;
const BRACKET_WIDTH = 8;
const LEADER_LINE_PADDING = 12;
const DATASOURCE_LABEL_HALF_HEIGHT = 7;
const BRACKET_VERTICAL_PADDING = 2;

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
        tickFormat: (name: string) => name.replaceAll("_", " "),
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
          fill: "white",
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
              `${item.name.replaceAll("_", " ")}\n${item.facet}: ${item.count.toLocaleString()}`,
          }),
        ),
      ],
    }) as SVGSVGElement;

    appendGroupDecorations({
      chart,
      groups,
      rowCount: nameOrder.length,
      height,
      labelColor: theme.palette.text.primary,
    });

    return chart;
  }
}

function appendGroupDecorations({
  chart,
  groups,
  rowCount,
  height,
  labelColor,
}: {
  chart: SVGSVGElement;
  groups: [string, { sourceId: string }[]][];
  rowCount: number;
  height: number;
  labelColor: string;
}) {
  const yLabels = [...chart.querySelectorAll<SVGTextElement>("[aria-label='y-axis tick label'] text")];
  if (yLabels.length !== rowCount) return;

  const labelPositions = yLabels.map((label) => getTranslation(label, chart));
  if (labelPositions.some(({ x, y }) => Number.isNaN(x) || Number.isNaN(y))) return;

  const namespace = "http://www.w3.org/2000/svg";
  const bands = document.createElementNS(namespace, "g");
  const annotations = document.createElementNS(namespace, "g");
  const chartWidth = Number(chart.getAttribute("width"));
  const labelMeasureContext = document.createElement("canvas").getContext("2d");
  if (!labelMeasureContext) return;
  labelMeasureContext.font = "13.5px sans-serif";
  const labelStart = (index: number) =>
    labelPositions[index].x - labelMeasureContext.measureText(yLabels[index].textContent ?? "").width;
  const yPositions = labelPositions.map(({ y }) => y);
  const rowSpacing = yPositions.length > 1 ? yPositions[1] - yPositions[0] : 23;
  let groupStart = 0;

  groups.forEach(([group, groupSources], groupIndex) => {
    const groupEnd = groupStart + groupSources.length - 1;
    const datasourceLabelStart = Math.min(
      ...Array.from({ length: groupSources.length }, (_, index) => labelStart(groupStart + index)),
    );
    const singleLeaderEnd = datasourceLabelStart - LEADER_LINE_PADDING;
    const bracketX = singleLeaderEnd - BRACKET_WIDTH;
    const top = groupStart === 0
      ? Math.max(CHART_EDGE_PADDING, yPositions[groupStart] - rowSpacing / 2)
      : (yPositions[groupStart - 1] + yPositions[groupStart]) / 2;
    const bottom = groupEnd === rowCount - 1
      ? Math.min(height - CHART_EDGE_PADDING, yPositions[groupEnd] + rowSpacing / 2)
      : (yPositions[groupEnd] + yPositions[groupEnd + 1]) / 2;
    const band = document.createElementNS(namespace, "rect");

    band.setAttribute("x", String(CHART_EDGE_PADDING));
    band.setAttribute("y", String(top));
    band.setAttribute("width", String(chartWidth - CHART_EDGE_PADDING * 2));
    band.setAttribute("height", String(bottom - top));
    band.setAttribute("fill", groupIndex % 2 === 0 ? grey[200] : grey[50]);
    bands.appendChild(band);

    const groupCenter = (yPositions[groupStart] + yPositions[groupEnd]) / 2;
    const label = document.createElementNS(namespace, "text");
    label.setAttribute("x", String(DATATYPE_LABEL_X));
    label.setAttribute("y", String(groupCenter));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "13");
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", labelColor);
    label.textContent = group;
    annotations.appendChild(label);

    const leader = document.createElementNS(namespace, "line");
    leader.setAttribute("x1", String(LEADER_LINE_START));
    leader.setAttribute("x2", String(groupSources.length === 1 ? singleLeaderEnd : bracketX));
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

  chart.insertBefore(bands, chart.firstChild);
  chart.appendChild(annotations);
}

function getTranslation(element: SVGElement, chart: SVGSVGElement) {
  let x = 0;
  let y = 0;
  let current: SVGElement | null = element;

  while (current && current !== chart) {
    const translate = current.getAttribute("transform")?.match(/translate\(([^,]+),\s*([^)]+)\)/);
    x += Number(translate?.[1] ?? 0);
    y += Number(translate?.[2] ?? 0);
    current = current.parentElement instanceof SVGElement ? current.parentElement : null;
  }

  return { x, y };
}

export default HierarchicalAssociationChart;
