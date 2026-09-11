import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import { format } from "d3";
import * as Plot from "@observablehq/plot";
import { clinicalStageCategories } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type ClinicalStageCoverage = {
  name: string;
  type: "Drugs" | "Reports";
  count: number;
};

const datasets = [
  { dataset: "drug_molecule", type: "Drugs" as const },
  { dataset: "clinical_report", type: "Reports" as const },
];
const formatCountTick = format("~s");

function DrugsCoverage({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const counts = new Map(
    data
      .filter(
        (row) =>
          datasets.some(({ dataset }) => row.dataset === dataset) &&
          row.kind === "grouping" &&
          row.metric === "clinicalStage" &&
          row.group_value
      )
      .map((row) => [`${row.dataset}:${row.group_value}`, row.value])
  );
  const stages = Array.from(
    new Set(
      data
        .filter(
          (row) =>
            datasets.some(({ dataset }) => row.dataset === dataset) &&
            row.kind === "grouping" &&
            row.metric === "clinicalStage" &&
            row.group_value
        )
        .map((row) => row.group_value)
    )
  )
    .map((value) => {
      const category = clinicalStageCategories[value as keyof typeof clinicalStageCategories];
      return { value, name: category?.label ?? value, index: category?.index ?? Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) => a.index - b.index);
  const chartData: ClinicalStageCoverage[] = stages.flatMap((stage) =>
    datasets.map(({ dataset, type }) => ({
      name: stage.name,
      type,
      count: counts.get(`${dataset}:${stage.value}`) ?? 0,
    }))
  );

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Drugs coverage
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
          mt: 3,
        }}
      >
        {datasets.map(({ type }) => (
          <Box key={type} sx={{ minWidth: 0 }}>
            <Typography align="center" sx={{ fontSize: "13px", fontWeight: 700 }}>
              {type}
            </Typography>
            <ObsPlot
              data={chartData.filter((item) => item.type === type)}
              minWidth={320}
              height={stages.length * 23 + 40}
              renderChart={({ data, width, height }) =>
                renderChart({ data, width, height, showYAxis: type === "Drugs" })
              }
              gapInfo={0}
              renderInfo={() => null}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );

  function renderChart({
    data: facetData,
    width,
    height,
    showYAxis,
  }: {
    data: ClinicalStageCoverage[];
    width?: number;
    height: number;
    showYAxis: boolean;
  }) {
    const color = facetData[0].type === "Drugs" ? theme.palette.secondary.main : theme.palette.primary.main;
    return Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 4,
      marginBottom: 24,
      marginLeft: showYAxis ? 140 : 12,
      marginRight: 50,
      x: { label: null, ticks: 4, tickFormat: formatCountTick, tickSize: 0, nice: true },
      y: showYAxis
        ? {
            domain: stages.map((stage) => stage.name),
            label: null,
            tickSize: 0,
            tickPadding: 8,
          }
        : { domain: stages.map((stage) => stage.name), axis: null },
      marks: [
        Plot.gridX({ ticks: 4, stroke: grey[300], strokeWidth: 1, strokeOpacity: 0.5 }),
        Plot.ruleY(facetData, { x1: 0, x2: "count", y: "name", stroke: color, strokeWidth: 3 }),
        Plot.dot(facetData, { x: "count", y: "name", fill: color, r: 4 }),
        Plot.text(facetData, {
          x: "count",
          y: "name",
          text: (item) => item.count.toLocaleString(),
          dx: 10,
          textAnchor: "start",
          fontSize: 13,
          fill: grey[600],
        }),
        Plot.crosshairY(facetData, { x: "count", y: "name" }),
        Plot.tip(
          facetData,
          Plot.pointerY({
            x: "count",
            y: "name",
            title: (item) => `${item.name}\n${item.type}: ${item.count.toLocaleString()}`,
          })
        ),
      ],
    });
  }
}

export default DrugsCoverage;
