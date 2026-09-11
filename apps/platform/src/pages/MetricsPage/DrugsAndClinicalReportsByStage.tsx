import { Box, Typography, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { clinicalStageCategories } from "@ot/constants";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type ClinicalStageCount = {
  name: string;
  count: number;
  type: "Reports" | "Drugs";
  index: number;
  y1: number;
  y2: number;
  y: number;
};

const datasets = [
  { dataset: "clinical_report", type: "Reports" as const },
  { dataset: "drug_molecule", type: "Drugs" as const },
];
const barHeight = 16;
const withinPairGap = 2;
const betweenPairGap = 5;
const pairHeight = barHeight * 2 + withinPairGap + betweenPairGap;

function DrugsAndClinicalReportsByStage({ data }: { data: MetricRow[] }) {
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
  const chartData: ClinicalStageCount[] = stages.flatMap((stage, stageIndex) =>
    datasets.map(({ dataset, type }, typeIndex) => {
      const y1 = stageIndex * pairHeight + typeIndex * (barHeight + withinPairGap);
      return {
        name: stage.name,
        count: counts.get(`${dataset}:${stage.value}`) ?? 0,
        type,
        index: stage.index,
        y1,
        y2: y1 + barHeight,
        y: y1 + barHeight / 2,
      };
    })
  );
  const chartHeight = stages.length * pairHeight - betweenPairGap;
  const stageLabels = stages.map((stage, index) => ({
    name: stage.name,
    y: index * pairHeight + barHeight / 2,
  }));

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0, mb: 1 }}>
        Drugs and clinical reports by stage
      </Typography>
      <ObsPlot
        data={chartData}
        otherData={{ textColor: theme.palette.text.primary }}
        minWidth={320}
        height={chartHeight + 8}
        renderChart={renderChart}
        xTooltip={(item) => item.count}
        yTooltip={(item) => `${item.name} — ${item.type}`}
        xAnchorTooltip="adapt"
        yAnchorTooltip="adapt"
        gapInfo={0}
        renderInfo={() => null}
      />
    </Box>
  );

  function renderChart({ data, width, height }: { data: ClinicalStageCount[]; width?: number; height: number }) {
    const plotWidth = Math.max((width ?? 0) - 210 - 24, 0);
    const maxCount = Math.max(...data.map((item) => item.count));
    const insideData = data.filter((item) => (item.count / maxCount) * plotWidth >= `${item.count.toLocaleString()}`.length * 7 + 12);
    const outsideData = data.filter((item) => !insideData.includes(item));
    const firstStageData = data.slice(0, datasets.length);

    return Plot.plot({
      width: width ?? 0,
      height,
      style: { fontSize: "13.5px" },
      marginTop: 4,
      marginBottom: 4,
      marginLeft: 140,
      marginRight: 0,
      x: { axis: null },
      y: { domain: [0, chartHeight], reverse: true, axis: null },
      color: { domain: ["Reports", "Drugs"], range: [theme.palette.primary.main, theme.palette.secondary.main] },
      marks: [
        Plot.rect(data, { x1: 0, x2: "count", y1: "y1", y2: "y2", fill: "type", className: "obs-tooltip" }),
        Plot.text(stageLabels, { x: 0, y: "y", text: "name", textAnchor: "end", dx: -8, fill: theme.palette.text.primary, lineAnchor: "middle" }),
        Plot.text(firstStageData, { x: 0, y: "y", text: "type", textAnchor: "start", dx: 6, fill: "#fff", lineAnchor: "middle", fontSize: 12.5, fontWeight: 700, className: "obs-tooltip" }),
        Plot.text(insideData, { x: "count", y: "y", text: (item) => item.count.toLocaleString(), textAnchor: "end", dx: -6, fill: "white", lineAnchor: "middle", fontSize: 12.5, className: "obs-tooltip" }),
        Plot.text(outsideData, { x: "count", y: "y", text: (item) => item.count.toLocaleString(), textAnchor: "start", dx: 6, fill: theme.palette.text.primary, lineAnchor: "middle", fontSize: 12.5, className: "obs-tooltip" }),
      ],
    });
  }
}

export default DrugsAndClinicalReportsByStage;
