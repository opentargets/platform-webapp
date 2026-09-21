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
          <CardContent sx={{ display: "flex", alignItems: "start", gap: 1, flexDirection: "column", justifyContent: "space-between", px: 3 }}>
            <Box >
                <Typography color="secondary" variant="h4" fontWeight="800" fontSize={29} >{formatRoundedCount(value)}</Typography>
            </Box>
            <Box sx={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "start", columnGap: "4px" }}>
              <Box sx={{ color: "secondary.main", fontSize: "1.4rem", flex: "0 0 35px", width: "35px" }}>
                <FontAwesomeIcon icon={icon as IconDefinition} />
              </Box>
              {/* <Tooltip title={format(",")(value)}> */}
                <Typography color="secondary" variant="body2" sx={{ textTransform: "capitalize", fontWeight: 400, fontSize: 14.5 }}>{label}</Typography>
              {/* </Tooltip> */}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

const evidenceCount = (data: MetricRow[]) =>
  data
    .filter((row) => row.dataset.startsWith("evidence_") && row.metric === "count")
    .reduce((sum, row) => sum + row.value, 0);

type SummaryMetric = readonly [string, IconDefinition, number];
const metricWidth = { xs: 145, sm: 165, md: 140 };

function SummaryMetricItem({ metric }: { metric: SummaryMetric }) {
  const [label, icon, value] = metric;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25, flex: `0 0 ${metricWidth.xs}px`, width: metricWidth.xs, ["@media (min-width:600px)"]: { flexBasis: metricWidth.sm, width: metricWidth.sm }, ["@media (min-width:900px)"]: { flexBasis: metricWidth.md, width: metricWidth.md } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
        <Box sx={{ color: "primary.main", fontSize: "1.4rem", width: 35 }}>
          <FontAwesomeIcon icon={icon} />
        </Box>
        <Typography color="secondary" variant="body2" textTransform="uppercase" pb={0} fontWeight={500} sx={{ whiteSpace: "nowrap" }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ pl: 0 }}>
        <Tooltip title={format(",")(value)}>
          <Typography color="secondary" variant="h4" fontWeight="900" >
            {formatRoundedCount(value)}
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
}

function PlatformMetricsSummary({ data }: { data: MetricRow[] }) {
  const cards = [
    {
      href: "#evidence",
      combined: true,
      metrics: [
        ["Targets", faDna, count(data, "target")],
        ["Diseases", faStethoscope, count(data, "disease")],
      ] as const,
      secondaryMetrics: [
        ["Evidence", faHexagonNodes, evidenceCount(data)],
        ["Direct association", faHexagonNodes, count(data, "association_overall_direct")],
        ["Indirect association", faHexagonNodes, count(data, "association_overall_indirect")],
      ] as const,
    },
    {
      href: "#drugs",
      metrics: [
        ["Drugs", faPrescriptionBottleMedical, count(data, "drug_molecule")],
        ["Clinical reports", faChartBar, count(data, "clinical_report")],
      ] as const,
    },
    {
      href: "#genetics",
      metrics: [
        ["Variants", faMapPin, count(data, "variant")],
        ["GWAS", faChartBar, count(data, "study")],
        ["Credible sets", faProjectDiagram, count(data, "credible_set")],
      ] as const,
    },
  ];

  return (
    <Box sx={{ display: "grid", gap: 2, mb: 4 }}>
      {cards.map(({ href, metrics, secondaryMetrics, combined }) => (
        <Card
          key={href}
          elevation={0}
          variant="outlined"
          sx={{
            width: "100%",
            cursor: "pointer",
            transition: "background-color 150ms ease",
            "&:hover": {
              backgroundColor: "#eef7fc",
              "& .metrics-details-link": { color: "primary.main", textDecoration: "underline !important" },
            },
          }}
        >
          <CardContent sx={{ p: 3, position: "relative", pb: 7 }}>
            {combined ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 3.5, md: 7 }, alignItems: "flex-start", pr: 10 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 3.5, md: 7 } }}>
                  {metrics.map((metric) => <SummaryMetricItem key={metric[0]} metric={metric} />)}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, position: "relative", flex: `1 1 ${metricWidth.xs * 3 + 32}px`, minWidth: metricWidth.xs * 3 + 32, ["@media (min-width:600px)"]: { flexBasis: metricWidth.sm * 3 + 32, minWidth: metricWidth.sm * 3 + 32 }, ["@media (min-width:900px)"]: { flexBasis: metricWidth.md * 3 + 64, minWidth: metricWidth.md * 3 + 64 }, ["@media (min-width:1200px)"]: { flexBasis: metricWidth.md * 3 + 96, minWidth: metricWidth.md * 3 + 96, pl: 0, "&::before": { content: '""', position: "absolute", left: -28, top: 8, bottom: 8, borderLeft: "1px solid", borderColor: "grey.400" } } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ color: "primary.main", fontSize: "1.4rem" }}><FontAwesomeIcon icon={metrics[0][1]} /></Box>
                    <Typography color="secondary" variant="body2" textTransform="uppercase" fontWeight={500}>{metrics[0][0]}</Typography>
                    <Typography color="secondary" variant="body2">-</Typography>
                    <Box sx={{ color: "primary.main", fontSize: "1.4rem" }}><FontAwesomeIcon icon={metrics[1][1]} /></Box>
                    <Typography color="secondary" variant="body2" textTransform="uppercase" fontWeight={500}>{metrics[1][0]}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "nowrap", gap: { xs: 3, md: 6 } }}>
                    {secondaryMetrics?.map(([label, , value]) => (
                      <Box key={label} sx={{ display: "flex", alignItems: "baseline", gap: 0.75, whiteSpace: "nowrap" }}>
                        <Typography color="secondary" variant="h4" fontWeight="900">{formatRoundedCount(value)}</Typography>
                        <Typography color="secondary" variant="caption" sx={{ whiteSpace: "nowrap" }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 3.5, md: 7 }, alignItems: "center", pr: 10 }}>
                {metrics.map((metric) => <SummaryMetricItem key={metric[0]} metric={metric} />)}
                {secondaryMetrics && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, md: 4 }, width: "100%" }}>
                  {secondaryMetrics.map(([label, icon, value]) => (
                    <Box key={label} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box sx={{ color: "primary.main", fontSize: "1rem" }}><FontAwesomeIcon icon={icon} /></Box>
                        <Typography color="secondary" variant="caption" sx={{ whiteSpace: "nowrap" }}>{label}</Typography>
                      </Box>
                      <Box sx={{ pl: 2.5 }}>
                        <Typography color="secondary" variant="body2" fontWeight="900">{formatRoundedCount(value)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                )}
              </Box>
            )}
              <Typography className="metrics-details-link" variant="body2" component="a" href={href} sx={{ color: "primary.main", position: "absolute", right: 24, bottom: 20, whiteSpace: "nowrap", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                Details
              </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export { PlatformMetricsSummary };
export default MetricsCards;
