import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { Paper, Typography } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards from "./MetricsCards";
import HierarchicalAssociationChart from "./HierarchicalAssociationChart";
import DrugsbyStageBubbles from "./DrugsbyStageBubbles";
import ByStudyTypeHBar from "./ByStudyTypeHBar";
import VariantsByConsequence from "./VariantsByConsequence";

export type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };

function MetricsPage() {
  const [data, setData] = useState<MetricRow[]>([]);

  useEffect(() => {
    csv(metricsCsv, autoType).then((d) => setData(d as unknown as MetricRow[]));
  }, []);

  return (
    <>
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

      <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
        <VariantsByConsequence data={data} />
      </Paper>
      
    </>
  );
}

export default MetricsPage;
