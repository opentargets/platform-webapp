import { useEffect, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import * as Plot from "@observablehq/plot";
import { DIVERGENT_SCHEME_RED_GREEN, PREDICTED_CONSEQUENCE_LOOKUP } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

const IMPACTS = ["HIGH", "MODERATE", "LOW", "MODIFIER"] as const;
const IMPACT_COLORS = [
  DIVERGENT_SCHEME_RED_GREEN[2],
  DIVERGENT_SCHEME_RED_GREEN[5],
  DIVERGENT_SCHEME_RED_GREEN[9],
  "#b3b3b3",
];
const MIN_COUNT = 1;
const HIGHEST_TICK = 1_000_000;
const ROW_HEIGHT = 23;
const AXIS_HEIGHT = 32;
const CHART_MARGIN_RIGHT = 32;
const CHART_GAP = 24;

type Impact = (typeof IMPACTS)[number];
type ConsequenceCount = {
  name: string;
  label: string;
  count: number;
  impact: Impact;
  placeholder?: boolean;
};

function VariantsFacet({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const consequences = data.flatMap((row): ConsequenceCount[] => {
    if (
      row.dataset !== "variant" ||
      row.kind !== "grouping" ||
      row.expression !== "aggregationValue" ||
      !row.group_value
    ) {
      return [];
    }

    const consequence =
      PREDICTED_CONSEQUENCE_LOOKUP[
        row.group_value.replace("_", ":") as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP
      ];
    if (!consequence) return [];

    return [{
      name: consequence.displayTerm,
      label: consequence.displayTerm.replace(/ variant$/, ""),
      count: row.value,
      impact: consequence.impact,
    }];
  });

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [consequences.length]);

  if (consequences.length === 0) return null;

  const impactDataByImpact = new Map(
    IMPACTS.map((impact) => [
      impact,
      consequences
        .filter((consequence) => consequence.impact === impact)
        .sort((a, b) => b.count - a.count),
    ]),
  );
  const rowMaxRows = [
    Math.max(impactDataByImpact.get("HIGH")?.length ?? 0, impactDataByImpact.get("MODERATE")?.length ?? 0),
    Math.max(impactDataByImpact.get("LOW")?.length ?? 0, impactDataByImpact.get("MODIFIER")?.length ?? 0),
  ];
  const labelColumnWidths = [
    getLabelColumnWidth([...(impactDataByImpact.get("HIGH") ?? []), ...(impactDataByImpact.get("LOW") ?? [])]),
    getLabelColumnWidth([...(impactDataByImpact.get("MODERATE") ?? []), ...(impactDataByImpact.get("MODIFIER") ?? [])]),
  ];
  const columnDomainMaxes = [
    getDomainMax([...(impactDataByImpact.get("HIGH") ?? []), ...(impactDataByImpact.get("LOW") ?? [])]),
    getDomainMax([...(impactDataByImpact.get("MODERATE") ?? []), ...(impactDataByImpact.get("MODIFIER") ?? [])]),
  ];
  const columnDecades = columnDomainMaxes.map((maxCount) => Math.log10(maxCount / MIN_COUNT));
  const availableBarWidth = containerWidth - labelColumnWidths.reduce((sum, width) => sum + width, 0) - CHART_MARGIN_RIGHT * 2 - CHART_GAP;
  const pixelsPerLogUnit = availableBarWidth > 0
    ? availableBarWidth / columnDecades.reduce((sum, decades) => sum + decades, 0)
    : 45;
  const columnWidths = columnDecades.map(
    (decades, index) => labelColumnWidths[index] + decades * pixelsPerLogUnit + CHART_MARGIN_RIGHT,
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Variants by impact
      </Typography>
      <Box
        sx={{
          display: "grid",
          columnGap: 3,
          gridTemplateColumns: `${columnWidths[0]}px ${columnWidths[1]}px`,
          mt: 2,
          overflowX: "auto",
          justifyContent: "start",
          rowGap: 0.5,
        }}
        ref={chartContainerRef}
      >
        {IMPACTS.map((impact, index) => {
          const impactData = impactDataByImpact.get(impact) ?? [];
          const rowMax = rowMaxRows[Math.floor(index / 2)];
          const chartData = [
            ...impactData,
            ...Array.from({ length: rowMax - impactData.length }, (_, emptyIndex) => ({
              name: `empty-${impact}-${emptyIndex}`,
              label: "",
              count: 0,
              impact,
              placeholder: true,
            })),
          ];
          const labelColumnWidth = labelColumnWidths[index % 2];
          const columnIndex = index % 2;
          const maxCount = columnDomainMaxes[columnIndex];
          const barAreaWidth = columnDecades[columnIndex] * pixelsPerLogUnit;

          return (
            <Box key={impact} sx={{ width: columnWidths[columnIndex] }}>
              <Typography align="center" sx={{ color: "text.primary", fontSize: "13px", fontWeight: 700 }}>
                {impact[0] + impact.slice(1).toLowerCase()}
              </Typography>
              <ObsPlot
                data={chartData}
                minWidth={columnWidths[columnIndex]}
                height={rowMax * ROW_HEIGHT + AXIS_HEIGHT}
                renderChart={({ data: chartData, width, height }) =>
                  renderChart({
                    data: chartData,
                    width,
                    height,
                    color: IMPACT_COLORS[index].toString(),
                    maxCount,
                    textColor: theme.palette.text.primary,
                    labelColumnWidth,
                    barAreaWidth,
                    highestTick: HIGHEST_TICK,
                    showXAxis: index >= 2,
                  })
                }
                gapInfo={0}
                renderInfo={() => null}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function renderChart({
  data,
  width,
  height,
  color,
  maxCount,
  textColor,
  labelColumnWidth,
  barAreaWidth,
  highestTick,
  showXAxis,
}: {
  data: ConsequenceCount[];
  width?: number;
  height: number;
  color: string;
  maxCount: number;
  textColor: string;
  labelColumnWidth: number;
  barAreaWidth: number;
  highestTick: number;
  showXAxis: boolean;
}) {
  const plottedData = data.filter(
    (consequence) => !consequence.placeholder && consequence.count >= MIN_COUNT,
  );
  const insideData = plottedData.filter(
    (consequence) =>
      ((Math.log(consequence.count) - Math.log(MIN_COUNT)) /
        (Math.log(maxCount) - Math.log(MIN_COUNT))) *
        barAreaWidth >=
      consequence.count.toLocaleString().length * 7 + 12,
  );
  const outsideData = plottedData.filter((consequence) => !insideData.includes(consequence));
  const tickValues = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000].filter(
    (tick) => tick <= highestTick,
  );

  return Plot.plot({
    width: width ?? 0,
    height,
    style: { fontSize: "13.5px" },
    marginTop: 4,
    marginBottom: 24,
    marginLeft: labelColumnWidth,
    marginRight: CHART_MARGIN_RIGHT,
    x: {
      type: "log",
      domain: [MIN_COUNT, maxCount],
      label: null,
      axis: showXAxis ? "bottom" : null,
      ticks: tickValues,
      tickFormat: "~s",
      tickSize: 0,
    },
    y: {
      domain: data.map((consequence) => consequence.name),
      label: null,
      tickSize: 0,
      tickPadding: 8,
      tickFormat: (name: string) => data.find((consequence) => consequence.name === name)?.label ?? name,
    },
    marks: [
      Plot.gridX({ ticks: tickValues, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.9 }),
      Plot.barX(plottedData, {
        x1: MIN_COUNT,
        x2: "count",
        y: "name",
        fill: color,
        insetTop: 3,
        insetBottom: 3,
      }),
      Plot.text(insideData, {
        x: "count",
        y: "name",
        text: (consequence) => consequence.count.toLocaleString(),
        dx: -6,
        textAnchor: "end",
        lineAnchor: "middle",
        fontSize: 12.5,
        fontWeight: 600,
        fill: "white",
      }),
      Plot.text(outsideData, {
        x: "count",
        y: "name",
        text: (consequence) => consequence.count.toLocaleString(),
        dx: 6,
        textAnchor: "start",
        lineAnchor: "middle",
        fontSize: 12.5,
        fill: textColor,
      }),
      Plot.crosshairY(data.filter((consequence) => !consequence.placeholder), { x: "count", y: "name" }),
      Plot.tip(
        data.filter((consequence) => !consequence.placeholder),
        Plot.pointerY({
          x: "count",
          y: "name",
          title: (consequence) => `${consequence.label}\n${consequence.count.toLocaleString()}`,
        }),
      ),
    ],
  });
}

function getLabelColumnWidth(data: ConsequenceCount[]) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 0;

  context.font = "13.5px sans-serif";
  return Math.max(...data.map((consequence) => context.measureText(consequence.label).width + 20));
}

function getDomainMax(data: ConsequenceCount[]) {
  return Math.max(...data.map((consequence) => consequence.count), HIGHEST_TICK);
}

export default VariantsFacet;
