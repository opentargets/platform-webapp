import { Box, Paper, Typography, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { PREDICTED_CONSEQUENCE_LOOKUP } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type ConsequenceCount = { name: string; count: number; consequences?: ConsequenceCount[] };

function VariantsByConsequence({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const consequences: ConsequenceCount[] = data
    .filter(
      (row) =>
        row.dataset === "variant" &&
        row.kind === "grouping" &&
        row.expression === "mostSevereConsequenceId" &&
        row.group_value,
    )
    .map((row) => ({
      name:
        PREDICTED_CONSEQUENCE_LOOKUP[
          row.group_value.replace("_", ":") as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP
        ]?.displayTerm ?? row.group_value,
      count: row.value,
    }))
    .sort((a, b) => b.count - a.count);
  const total = consequences.reduce((sum, consequence) => sum + consequence.count, 0);
  const otherConsequences = consequences.filter(
    (consequence) => consequence.count < total * 0.01,
  );
  const chartData = consequences.filter((consequence) => consequence.count >= total * 0.01);

  if (otherConsequences.length > 0) {
    chartData.push({
      name: "Other",
      count: otherConsequences.reduce((sum, consequence) => sum + consequence.count, 0),
      consequences: otherConsequences,
    });
  }

  if (chartData.length === 0) return null;

  return (
    <Paper
      sx={{ py: 2, px: 3, maxWidth: "100%" }}
      elevation={0}
      variant="outlined"
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          Variants by most severe consequence
        </Typography>
        <ObsPlot
          data={chartData}
          otherData={{ textColor: theme.palette.text.primary }}
          minWidth={320}
          height={chartData.length * 23 + 8}
          renderChart={renderChart}
          xTooltip={(item) => item.count}
          yTooltip={(item) => item.name}
          xAnchorTooltip="adapt"
          yAnchorTooltip="adapt"
          renderTooltip={renderTooltip}
          gapInfo={0}
          renderInfo={() => null}
        />
      </Box>
    </Paper>
  );

  function renderChart({
    data,
    width,
    height,
  }: {
    data: ConsequenceCount[];
    width?: number;
    height: number;
  }) {
    const plotWidth = Math.max((width ?? 0) - 210 - 24, 0);
    const maxCount = Math.max(...data.map((item) => item.count));
    const insideData = data.filter(
      (item) =>
        (item.count / maxCount) * plotWidth >=
        `${item.count.toLocaleString()}`.length * 7 + 12,
    );
    const outsideData = data.filter((item) => !insideData.includes(item));

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
        domain: data.map((item) => item.name),
        label: null,
        tickSize: 0,
        tickPadding: 8,
      },
      marks: [
        Plot.barX(data, {
          x: "count",
          y: "name",
          fill: (item) =>
            item.consequences ? theme.palette.primary.light : theme.palette.primary.main,
          insetTop: 2,
          insetBottom: 2,
          className: "obs-tooltip",
        }),
        Plot.text(insideData, {
          x: (item) => item.count,
          y: "name",
          text: (item) => item.count.toLocaleString(),
          textAnchor: "end",
          dx: -6,
          fill: "white",
          lineAnchor: "middle",
          fontSize: 12.5,
          pointerEvents: "none",
          className: "obs-tooltip",
        }),
        Plot.text(outsideData, {
          x: (item) => item.count,
          y: "name",
          text: (item) => item.count.toLocaleString(),
          textAnchor: "start",
          dx: 6,
          fill: theme.palette.text.primary,
          lineAnchor: "middle",
          fontSize: 12.5,
          pointerEvents: "none",
          className: "obs-tooltip",
        }),
      ],
    });
  }
}

function renderTooltip(consequence: ConsequenceCount) {
  if (!consequence.consequences) return null;

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
      {consequence.consequences.map((item) => (
        <Typography key={item.name} variant="body2">
          {item.name}: {item.count.toLocaleString()}
        </Typography>
      ))}
    </Box>
  );
}

export default VariantsByConsequence;
