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
  "#888888",
];
const MIN_COUNT = 1;
const ROW_HEIGHT = 38;
const AXIS_HEIGHT = 32;
const PIXELS_PER_LOG_UNIT = 35;
const CHART_MARGIN_LEFT = 8;

type Impact = (typeof IMPACTS)[number];
type ConsequenceCount = {
  name: string;
  label: string;
  count: number;
  impact: Impact;
  placeholder?: boolean;
};

function VariantLollipops({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
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
  const maxRows = Math.max(...IMPACTS.map((impact) => consequences.filter((item) => item.impact === impact).length));

  if (consequences.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Variants by impact
      </Typography>
      <Box sx={{ display: "flex", gap: 3, mt: 2, overflowX: "auto" }}>
        {IMPACTS.map((impact, index) => {
          const impactData = consequences
            .filter((consequence) => consequence.impact === impact)
            .sort((a, b) => b.count - a.count);
          const chartData = [
            ...impactData,
            ...Array.from({ length: maxRows - impactData.length }, (_, emptyIndex) => ({
              name: `empty-${impact}-${emptyIndex}`,
              label: "",
              count: 0,
              impact,
              placeholder: true,
            })),
          ];
          const maxCount = Math.max(...impactData.map((consequence) => consequence.count), MIN_COUNT);
          const plotWidth = Math.log10(maxCount / MIN_COUNT) * PIXELS_PER_LOG_UNIT;
          const chartMarginRight = getChartMarginRight(impactData, maxCount);

          return (
            <Box key={impact} sx={{ flex: "0 0 auto", width: CHART_MARGIN_LEFT + plotWidth + chartMarginRight }}>
              <Typography align="center" sx={{ color: "text.primary", fontSize: "13px", fontWeight: 700 }}>
                {impact[0] + impact.slice(1).toLowerCase()}
              </Typography>
              <ObsPlot
                data={chartData}
                minWidth={CHART_MARGIN_LEFT + plotWidth + chartMarginRight}
                height={maxRows * ROW_HEIGHT + AXIS_HEIGHT}
                renderChart={({ data: chartData, width, height }) =>
                  renderChart({
                    data: chartData,
                    width,
                    height,
                    color: IMPACT_COLORS[index].toString(),
                    maxCount,
                    textColor: theme.palette.text.primary,
                    chartMarginRight,
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
  chartMarginRight,
}: {
  data: ConsequenceCount[];
  width?: number;
  height: number;
  color: string;
  maxCount: number;
  textColor: string;
  chartMarginRight: number;
}) {
  const plottedData = data.filter(
    (consequence) => !consequence.placeholder && consequence.count >= MIN_COUNT,
  );
  const tickValues = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000].filter(
    (tick) => tick <= maxCount,
  );
  return Plot.plot({
    width: width ?? 0,
    height,
    style: { fontSize: "13.5px" },
    marginTop: 8,
    marginBottom: 24,
    marginLeft: CHART_MARGIN_LEFT,
    marginRight: chartMarginRight,
    x: { type: "log", domain: [MIN_COUNT, maxCount], label: null, ticks: tickValues, tickFormat: "~s", tickSize: 0 },
    y: { domain: data.map((consequence) => consequence.name), axis: null },
    marks: [
      Plot.gridX({ ticks: tickValues, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.9 }),
      Plot.ruleY(plottedData, { x1: MIN_COUNT, x2: "count", y: "name", stroke: color, strokeWidth: 3 }),
      Plot.dot(plottedData, { x: "count", y: "name", fill: color, r: 5 }),
      Plot.text(plottedData, {
        x: MIN_COUNT,
        y: "name",
        text: (consequence) => consequence.label,
        textAnchor: "start",
        dy: -10,
        lineAnchor: "bottom",
        fontSize: 13.5,
        fill: textColor,
      }),
      Plot.text(plottedData, {
        x: "count",
        y: "name",
        text: (consequence) => consequence.count.toLocaleString(),
        textAnchor: "start",
        dx: 8,
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

function getChartMarginRight(data: ConsequenceCount[], maxCount: number) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 56;

  context.font = "12.5px sans-serif";
  const widestCount = Math.max(...data.map((consequence) => context.measureText(consequence.count.toLocaleString()).width));
  context.font = "13.5px sans-serif";
  const finalTick = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]
    .filter((tick) => tick <= maxCount)
    .at(-1) ?? MIN_COUNT;
  const finalTickLabel = finalTick >= 1_000_000
    ? `${finalTick / 1_000_000}M`
    : finalTick >= 1_000
      ? `${finalTick / 1_000}k`
      : finalTick.toString();
  const finalTickWidth = context.measureText(finalTickLabel).width;

  return Math.max(widestCount + 12, finalTickWidth / 2 + 4);
}

export default VariantLollipops;
