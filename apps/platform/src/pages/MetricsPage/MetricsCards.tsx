import { format } from "d3";
import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleMedical,
  faStethoscope,
  faProjectDiagram,
  faHexagonNodes,
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
    ["Drugs and Clinical Candidates", faPrescriptionBottleMedical, count(data, "drug_molecule")],
    ["Clinical Reports", faChartBar, count(data, "clinical_report")],
    ["GWAS", faChartBar, count(data, "study")],
    ["Target-Disease Evidence", faHexagonNodes, data.filter((row) => row.dataset.startsWith("evidence_") && row.metric === "count").reduce((sum, row) => sum + row.value, 0)],
    ["Direct Target-Disease Associations", faHexagonNodes, count(data, "association_overall_direct")],
    ["Indirect Target-Disease associations", faHexagonNodes, count(data, "association_overall_indirect")],
    ["Credible Sets", faProjectDiagram, count(data, "credible_set")],
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
          <CardContent sx={{ display: "flex", alignItems: "start", gap: 1, flexDirection: "column", justifyContent: "space-between", px: 3 }}>
            <Box >
                <Typography color="secondary" variant="h4" fontWeight="800" fontSize={29} >{formatRoundedCount(value)}</Typography>
            </Box>
            <Box sx={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "4px" }}>
              <Box sx={{ color: "secondary.main", fontSize: "1.4rem", flex: "0 0 35px", width: "35px" }}>
                <FontAwesomeIcon icon={icon as IconDefinition} />
              </Box>
              <Typography color="secondary" variant="body2" sx={{ fontWeight: 400, fontSize: 14.5 }}>{label}</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default MetricsCards;