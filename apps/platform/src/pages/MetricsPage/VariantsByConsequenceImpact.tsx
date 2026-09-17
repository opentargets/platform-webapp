import { useState } from "react";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import * as Plot from "@observablehq/plot";
import { DIVERGENT_SCHEME_RED_GREEN, PREDICTED_CONSEQUENCE_LOOKUP } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

const MIN_COUNT = 10;
const INITIAL_ROW_COUNT = 12;
const ROW_HEIGHT = 23;
const AXIS_HEIGHT = 32;
const BUTTON_HEIGHT = 36;
const IMPACTS = ["HIGH", "MODERATE", "LOW", "MODIFIER"] as const;
const IMPACT_COLORS = {
  HIGH: DIVERGENT_SCHEME_RED_GREEN[2].toString(),
  MODERATE: DIVERGENT_SCHEME_RED_GREEN[5].toString(),
  LOW: DIVERGENT_SCHEME_RED_GREEN[9].toString(),
  MODIFIER: "#b3b3b3",
};

type Impact = keyof typeof IMPACT_COLORS;
type ConsequenceCount = {
  name: string;
  count: number;
  impact: Impact;
};

function VariantsByConsequenceImpact({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const consequences: ConsequenceCount[] = data
    .filter(
      (row) =>
        row.dataset === "variant" &&
        row.kind === "grouping" &&
        row.expression === "aggregationValue" &&
        row.group_value,
    )
    .flatMap((row): ConsequenceCount[] => {
      const consequence =
        PREDICTED_CONSEQUENCE_LOOKUP[
          row.group_value.replace("_", ":") as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP
        ];
      if (!consequence) return [];

      return [{
        name: consequence.displayTerm.replace(/ variant$/, ""),
        count: row.value,
        impact: consequence.impact,
      }];
    })
    .sort((a, b) => b.count - a.count);

  if (consequences.length === 0) return null;
  const labelColumnWidth = getLabelColumnWidth(consequences);
  const maxCount = Math.max(...consequences.map((consequence) => consequence.count), MIN_COUNT);
  const chartMarginRight = getChartMarginRight(consequences, maxCount);
  const visibleRows = isExpanded ? consequences.length : Math.min(INITIAL_ROW_COUNT, consequences.length);
  const chartBodyHeight = consequences.length * ROW_HEIGHT;
  const canExpand = consequences.length > INITIAL_ROW_COUNT;
  const viewportHeight = visibleRows * ROW_HEIGHT + (canExpand ? BUTTON_HEIGHT : 0) + AXIS_HEIGHT;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Variants by impact
      </Typography>
      <Box sx={{ alignItems: "flex-start", display: "flex", gap: 4, mt: 2, pr: 1 }}>
        <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
          <Box
            sx={{
              height: viewportHeight,
              overflow: "hidden",
              position: "relative",
              transition: "height 280ms ease",
            }}
          >
            <ObsPlot
              data={consequences}
              minWidth={320}
              height={chartBodyHeight}
              renderChart={({ data: chartData, width, height }) =>
                renderChart({
                  data: chartData,
                  width,
                  height,
                  textColor: theme.palette.text.primary,
                  labelColumnWidth,
                  maxCount,
                  chartMarginRight,
                })
              }
              gapInfo={0}
              renderInfo={() => null}
            />
            {canExpand && (
              <Box
                sx={{
                  alignItems: "center",
                  backgroundColor: "background.paper",
                  bottom: AXIS_HEIGHT,
                  display: "flex",
                  height: BUTTON_HEIGHT,
                  left: 0,
                  pl: `${labelColumnWidth}px`,
                  position: "absolute",
                  right: 0,
                }}
              >
                <Button onClick={() => setIsExpanded((expanded) => !expanded)} size="small">
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              </Box>
            )}
            <Box sx={{ backgroundColor: "background.paper", bottom: 0, left: 0, position: "absolute", right: 0 }}>
              <ObsPlot
                data={[]}
                minWidth={320}
                height={AXIS_HEIGHT}
                renderChart={({ width, height }) =>
                  renderAxis({ width, height, labelColumnWidth, maxCount, chartMarginRight })
                }
                gapInfo={0}
                renderInfo={() => null}
              />
            </Box>
          </Box>
        </Box>
        <ImpactLegend />
      </Box>
    </Box>
  );
}

function renderChart({
  data,
  width,
  height,
  textColor,
  labelColumnWidth,
  maxCount,
  chartMarginRight,
}: {
  data: ConsequenceCount[];
  width?: number;
  height: number;
  textColor: string;
  labelColumnWidth: number;
  maxCount: number;
  chartMarginRight: number;
}) {
  const tickValues = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000].filter(
    (tick) => tick >= MIN_COUNT && tick <= maxCount,
  );

  return Plot.plot({
    width: width ?? 0,
    height,
    style: { fontSize: "13.5px" },
    marginTop: 0,
    marginBottom: 0,
    marginLeft: labelColumnWidth,
    marginRight: chartMarginRight,
    x: { type: "log", domain: [MIN_COUNT, maxCount], axis: null },
    color: { domain: IMPACTS, range: IMPACTS.map((impact) => IMPACT_COLORS[impact]) },
    y: {
      domain: data.map((consequence) => consequence.name),
      label: null,
      tickSize: 0,
      tickPadding: 8,
    },
    marks: [
      Plot.gridX({ ticks: tickValues, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.9 }),
      Plot.ruleY(data, {
        x1: MIN_COUNT,
        x2: "count",
        y: "name",
        stroke: "impact",
        strokeWidth: 3,
      }),
      Plot.dot(data, { x: "count", y: "name", fill: "impact", r: 5 }),
      Plot.text(data, {
        x: "count",
        y: "name",
        text: (consequence) => consequence.count.toLocaleString(),
        textAnchor: "start",
        dx: 8,
        fill: textColor,
        lineAnchor: "middle",
        fontSize: 12.5,
      }),
    ],
  });
}

function renderAxis({
  width,
  height,
  labelColumnWidth,
  maxCount,
  chartMarginRight,
}: {
  width?: number;
  height: number;
  labelColumnWidth: number;
  maxCount: number;
  chartMarginRight: number;
}) {
  const tickValues = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000].filter(
    (tick) => tick >= MIN_COUNT && tick <= maxCount,
  );

  return Plot.plot({
    width: width ?? 0,
    height,
    style: { fontSize: "13.5px" },
    marginTop: 0,
    marginBottom: 20,
    marginLeft: labelColumnWidth,
    marginRight: chartMarginRight,
    x: { type: "log", domain: [MIN_COUNT, maxCount], label: null, ticks: tickValues, tickFormat: "~s", tickSize: 0 },
  });
}

function ImpactLegend() {
  return (
    <Box sx={{ display: "flex", flex: "0 0 auto", flexDirection: "column", gap: 0.5, pt: 0.5 }}>
      <Typography sx={{ fontSize: "13.5px", fontWeight: 700 }}>Impact</Typography>
      {IMPACTS.map((impact) => (
        <Box key={impact} sx={{ alignItems: "center", display: "flex", gap: 0.5 }}>
          <Box sx={{ backgroundColor: IMPACT_COLORS[impact], height: 12, width: 12 }} />
          <Typography sx={{ fontSize: "13.5px" }}>{impact[0] + impact.slice(1).toLowerCase()}</Typography>
        </Box>
      ))}
    </Box>
  );
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

  return Math.max(widestCount + 12, context.measureText(finalTickLabel).width / 2 + 4);
}

function getLabelColumnWidth(data: ConsequenceCount[]) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 0;

  context.font = "13.5px sans-serif";
  return Math.max(...data.map((consequence) => context.measureText(consequence.name).width + 28));
}

export default VariantsByConsequenceImpact;
