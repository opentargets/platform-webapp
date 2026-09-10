import { format } from "d3";
import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleMedical,
  faStethoscope,
  faProjectDiagram,
  faCircleNodes,
  faHexagonNodes,
  faShareNodes
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Tooltip, Box, Card, CardContent, Typography } from "ui";
import type { MetricRow } from "./MetricsPage";

const count = (rows: MetricRow[], dataset: string) =>
  rows.find((row) => row.dataset === dataset && row.kind === "scalar" && row.metric === "count")?.value ?? 0;

const formatRoundedCount = (value: number) => {
  if (value === 0) return "0";

  return format(".2~s")(value);
};

function MetricsCards({ data }: { data: MetricRow[] }) {
  const metrics = [
    ["Targets", faDna, count(data, "target")],
    ["Diseases", faStethoscope, count(data, "disease")],
    ["Drugs", faPrescriptionBottleMedical, count(data, "drug_molecule")],
    ["Clinical reports", faChartBar, count(data, "clinical_report")],
    ["GWAS", faChartBar, count(data, "study")],
    ["Direct target-disease association", faHexagonNodes, count(data, "association_overall_direct")],
    ["Indirect target-disease association", faHexagonNodes, count(data, "association_overall_indirect")],
    ["Target-disease Evidence", faHexagonNodes, data.filter((row) => row.dataset.startsWith("evidence_") && row.metric === "count").reduce((sum, row) => sum + row.value, 0)],
    ["Credible sets", faProjectDiagram, count(data, "credible_set")],
    ["Variants", faMapPin, count(data, "variant")],
  ] as const;

  return (
    <Box
      sx={{
        mt: 4,
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
        <Card key={label} sx={{ width: "100%" }} elevation={0} variant="outlined">
          <CardContent sx={{ display: "flex", alignItems: "start", gap: 1, flexDirection: "column", justifyContent: "space-between", p:4 }}>
            <Box >
              <Tooltip title={format(",")(value)}>
                <Typography color="secondary" variant="h4" fontWeight="900">{formatRoundedCount(value)}</Typography>
              </Tooltip>
            </Box>
            <Box sx={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "start" }}>
              <Box sx={{color: "primary.main", fontSize: "1.4rem", width: 35}}>
                <FontAwesomeIcon icon={icon as IconDefinition} />
              </Box>
              <Typography color="secondary" variant="body2" sx={{ textTransform: "capitalize" }}>{label}</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default MetricsCards;
