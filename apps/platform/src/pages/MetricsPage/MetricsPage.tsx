import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { Paper, Typography } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards, { PlatformMetricsSummary } from "./MetricsCards";
import HierarchicalAssociationChart from "./HierarchicalAssociationChart";
import DrugsbyStageBubbles from "./DrugsByStageBubbles";
import ByStudyTypeHBar from "./ByStudyTypeHBar";
// import VariantsByConsequence from "./VariantsByConsequence";
import VariantsByConsequenceImpact from "./VariantsByConsequenceImpact";
// import VariantsFacet from "./VariantsFacet";
// import VariantLollipops from "./VariantLollipops";

export type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };

function MetricsPage() {
  const [data, setData] = useState<MetricRow[]>([]);

  useEffect(() => {
    csv(metricsCsv, autoType).then((d) => setData(d as unknown as MetricRow[]));
  }, []);

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Platform Metrics
      </Typography>
      <MetricsCards data={data} />

      <Paper sx={{ py: 2, px: 3, maxWidth: "100%", mt: 4 }} elevation={0} variant="outlined">
        <HierarchicalAssociationChart data={data} />
      </Paper>
      <br />
      
      <Paper sx={{ py: 2, px: 3, maxWidth: "100%", mt: 2 }} elevation={0} variant="outlined">
        <DrugsbyStageBubbles data={data} />
      </Paper>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Genetics</Typography>

      <br />

      <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
        <ByStudyTypeHBar data={data} dataset="study" title="Studies by study type" />
        <ByStudyTypeHBar
          data={data}
          dataset="credible_set"
          title="Credible sets by study type"
        />
        <ByStudyTypeHBar
          data={data}
          dataset="colocalisation"
          metric="studyTypePair"
          title="Colocalisation by type"
        />
      </Paper>

      <br />

      <Paper sx={{ py: 2, px: 3, maxWidth: "100%", mt: 2 }} elevation={0} variant="outlined">
        <VariantsByConsequenceImpact data={data} />
      </Paper>
      
    </>
  );
}

export default MetricsPage;
