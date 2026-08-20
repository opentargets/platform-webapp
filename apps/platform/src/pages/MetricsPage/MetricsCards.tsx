import { Box, Card, CardContent, Typography } from "@mui/material";
import { format } from "d3";
import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleMedical,
  faStethoscope,
  faProjectDiagram,
  faCircleNodes
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Tooltip } from "ui";
import type { MetricRow } from "./MetricsPage";

const count = (rows: MetricRow[], dataset: string) =>
  rows.find((row) => row.dataset === dataset && row.kind === "scalar" && row.metric === "count")?.value ?? 0;

const formatRoundedCount = (value: number) => {
  if (value === 0) return "0";

  const unitExponent = Math.max(0, Math.floor(Math.log10(Math.abs(value)) / 3));
  const unit = 10 ** (unitExponent * 3);
  const roundedValue = Math.round((value / unit) * 10) / 10;
  return format("~s")(roundedValue * unit);
};

function MetricsCards({ data }: { data: MetricRow[] }) {
  const metrics = [
    ["Targets", faDna, count(data, "target")],
    ["Diseases", faStethoscope, count(data, "disease")],
    ["Drugs", faPrescriptionBottleMedical, count(data, "drug_molecule")],
    ["Studies", faChartBar, count(data, "study")],
    ["Credible sets", faProjectDiagram, count(data, "credible_set")],
    ["Evidence", faProjectDiagram, data.filter((row) => row.dataset.startsWith("evidence_") && row.metric === "count").reduce((sum, row) => sum + row.value, 0)],
    ["Variants", faMapPin, count(data, "variant")],
    ["Prioritised genes", faDna, data.find((row) => row.dataset === "l2g_prediction" && row.kind === "filter" && row.metric === "prioritised_genes")?.value ?? 0],
    ["GWAS/GWAS colocs", faCircleNodes, data.find((row) => row.dataset === "colocalisation" && row.group_value === "gwas-gwas")?.value ?? 0],
    ["GWAS/QTL colocs", faCircleNodes, data.find((row) => row.dataset === "colocalisation" && row.group_value === "gwas-eqtl")?.value ?? 0],
  ] as const;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
          xl: "repeat(5, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      {metrics.map(([label, icon, value]) => (
        <Card key={label} sx={{ width: "100%" }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ color: "primary.main", fontSize: "2rem", width: 42, textAlign: "center" }}>
              <FontAwesomeIcon icon={icon as IconDefinition} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ textTransform: "uppercase" }}>{label}</Typography>
              <Tooltip title={format(",")(value)}>
                <Typography variant="h5" fontWeight="600">{formatRoundedCount(value)}</Typography>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default MetricsCards;
