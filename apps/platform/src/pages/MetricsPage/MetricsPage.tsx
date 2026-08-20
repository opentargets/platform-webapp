import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { Box, Card, CardContent, Grid, Typography, useTheme } from "@mui/material";
import { format } from "d3";
import * as Plot from "@observablehq/plot";
import { therapeuticAreas } from "@ot/constants";
import { ObsPlot } from "ui";
import metricsCsv from "./metrics.csv?url";
import {
  faBook,
  faChartBar,
  faDna,
  faLink,
  faMapPin,
  faNetworkWired,
  faPrescriptionBottleMedical,
  faStethoscope,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };
type TherapeuticAreaCount = {
  name: string;
  count: number;
  areas?: { name: string; count: number }[];
};

const count = (rows: MetricRow[], dataset: string) =>
  rows.find((row) => row.dataset === dataset && row.kind === "scalar" && row.metric === "count")?.value ?? 0;

function DiseaseByTherapeuticArea({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const areas = data
    .filter((row) => row.dataset === "disease" && row.kind === "grouping" && row.metric === "therapeuticArea")
    .map((row) => ({
      name: therapeuticAreas[row.group_value] ?? row.group_value,
      count: row.value,
    }));
  const total = count(data, "disease");
  const otherAreas = areas.filter((area) => area.count < total * 0.02).sort((a, b) => b.count - a.count);
  const chartData: TherapeuticAreaCount[] = areas
    .filter((area) => area.count >= total * 0.02)
    .sort((a, b) => b.count - a.count);

  if (otherAreas.length > 0) {
    chartData.push({
      name: "Other",
      count: otherAreas.reduce((sum, area) => sum + area.count, 0),
      areas: otherAreas,
    });
  }

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h6" sx={{ m: 0 }}>
        Diseases by therapeutic area
      </Typography>
      <ObsPlot
        data={chartData}
        otherData={{ textColor: theme.palette.text.primary }}
        minWidth={320}
        height={chartData.length * 28 + 8}
        renderChart={renderDiseaseByTherapeuticAreaChart}
        xTooltip={(area) => area.count}
        yTooltip={(area) => area.name}
        xAnchorTooltip="adapt"
        yAnchorTooltip="adapt"
        renderTooltip={renderDiseaseByTherapeuticAreaTooltip}
        gapInfo={0}
        renderInfo={() => null}
      />
    </Box>
  );
}

function renderDiseaseByTherapeuticAreaChart({
  data,
  otherData,
  width,
  height,
}: {
  data: TherapeuticAreaCount[];
  otherData?: { textColor: string };
  width?: number;
  height: number;
}) {
  const plotWidth = Math.max((width ?? 0) - 210 - 24, 0);
  const maxCount = Math.max(...data.map((area) => area.count));
  const countLabelWidth = (area: TherapeuticAreaCount) => `${area.count.toLocaleString()}`.length * 7 + 12;
  const isInside = (area: TherapeuticAreaCount) => (area.count / maxCount) * plotWidth >= countLabelWidth(area);
  const insideData = data.filter(isInside);
  const outsideData = data.filter((area) => !isInside(area));

  return Plot.plot({
    width: width ?? 0,
    height,
    style: { fontSize: "14px" },
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 210,
    marginRight: 24,
    x: { axis: null },
    y: { domain: data.map((area) => area.name), label: null, tickSize: 0, tickPadding: 8, tickFormat: (name) => name },
    marks: [
      Plot.barX(data, {
        x: "count",
        y: "name",
        fill: (area) => (area.areas ? "#5b89b0" : "#1963a3"),
        insetTop: 3,
        insetBottom: 3,
        className: "obs-tooltip",
      }),
      Plot.text(insideData, {
        x: (area) => area.count,
        y: "name",
        text: (area) => area.count.toLocaleString(),
        textAnchor: "end",
        dx: -6,
        fill: "white",
        lineAnchor: "middle",
        fontSize: 13,
        className: "obs-tooltip",
      }),
      Plot.text(outsideData, {
        x: (area) => area.count,
        y: "name",
        text: (area) => area.count.toLocaleString(),
        textAnchor: "start",
        dx: 6,
        fill: otherData?.textColor ?? "currentColor",
        lineAnchor: "middle",
        fontSize: 13,
        className: "obs-tooltip",
      }),
    ],
  });
}

function renderDiseaseByTherapeuticAreaTooltip(area: TherapeuticAreaCount) {
  if (!area.areas) return null;

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
      {area.areas?.map((otherArea) => (
        <Typography key={otherArea.name} variant="body2">
          {otherArea.name}: {otherArea.count.toLocaleString()}
        </Typography>
      ))}
    </Box>
  );
}

function MetricsPage() {
  const [data, setData] = useState<MetricRow[]>([]);

  useEffect(() => {
    csv(metricsCsv, autoType).then((d) => {
      setData(d as unknown as MetricRow[]);
    });
  }, []);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>Data Metrics</Typography>

      <Grid container spacing={2}>
        {[
          ["Targets", faDna, count(data, "target")],
          ["Diseases", faStethoscope, count(data, "disease")],
          ["Drugs", faPrescriptionBottleMedical, count(data, "drug_molecule")],
          ["Studies", faChartBar, count(data, "study")],
          ["Credible sets", faBook, count(data, "credible_set")],
          ["Evidence", faLink, data.filter((row) => row.dataset.startsWith("evidence_") && row.metric === "count").reduce((sum, row) => sum + row.value, 0)],
          ["Variants", faMapPin, count(data, "variant")],
          ["Prioritised genes", faDna, data.find((row) => row.dataset === "l2g_prediction" && row.kind === "filter" && row.metric === "prioritised_genes")?.value ?? 0],
          ["GWAS/GWAS colocs", faNetworkWired, data.find((row) => row.dataset === "colocalisation" && row.group_value === "gwas-gwas")?.value ?? 0],
          ["GWAS/QTL colocs", faNetworkWired, data.find((row) => row.dataset === "colocalisation" && row.group_value === "gwas-eqtl")?.value ?? 0],
        ].map(([label, icon, value]) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={label as string}>
            <Card><CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ color: "primary.main", fontSize: "2rem", width: 42, textAlign: "center" }}><FontAwesomeIcon icon={icon as IconDefinition} /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight="fontWeightBold">{format("~s")(value as number)}</Typography>
              </Box>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>
      <Typography sx={{ pt: 3 }}><b>Polish:</b> capitalise titles, round numbers, use correct icons, make less like buttons(?)</Typography>
      <Typography sx={{ pb: 3 }}><b>Alternative:</b> more hierarchical, e.g. split into top-level entity counts then evidence linking targets and diseases, credible sets and colocs in variants section.</Typography>

      <Typography variant="h5" sx={{ mb: 2 }}>Coverage</Typography>
      <DiseaseByTherapeuticArea data={data} />
      <Typography sx={{ pt: 3 }}><b>Polish:</b> bars are so 'strong' - maybe ok if will be 1/2 page otherwise consider outline bars</Typography>
      <Typography sx={{ pb: 3 }}><b>Alternative:</b>Replace Other with 'show more'?</Typography>


    </>
  );
}

export default MetricsPage;
