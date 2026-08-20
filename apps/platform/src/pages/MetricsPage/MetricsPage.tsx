import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { Typography } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards from "./MetricsCards";
import DiseasesByTherapeuticArea from "./DiseasesByTherapeuticArea";

export type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };

function MetricsPage() {
  const [data, setData] = useState<MetricRow[]>([]);

  useEffect(() => {
    csv(metricsCsv, autoType).then((d) => setData(d as unknown as MetricRow[]));
  }, []);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>Data Metrics</Typography>
      <MetricsCards data={data} />
      <Typography sx={{ pt: 3 }}><b>Todo:</b> finalise card order and icons - what for coloc? evidence and cred sets ok to be same? </Typography>
      <Typography sx={{ pb: 3 }}><b>Alternative:</b> more hierarchical, e.g. split into top-level entity counts then evidence linking targets and diseases, credible sets and colocs in variants section.</Typography>
      <Typography variant="h5" sx={{ mb: 2 }}>Coverage</Typography>
      <DiseasesByTherapeuticArea data={data} />
      <Typography sx={{ pt: 3 }}><b>Alternative:</b>Replace Other with 'show more'?</Typography>
    </>
  );
}

export default MetricsPage;
