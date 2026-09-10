import { useEffect, useState } from "react";
import { Box } from "ui";
import { autoType, csv } from "d3";
import { Paper, Typography } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards from "./MetricsCards";
import DiseasesByTherapeuticArea from "./DiseasesByTherapeuticArea";
import AssociationFacetChart from "./AssociationFacetChart";
import DrugsByClinicalStage from "./DrugsByClinicalStage";
import ClinicalReportsByStage from "./ClinicalReportsByStage";
import CredibleSetsByStudyType from "./CredibleSetsByStudyType";
import ColocalisationByType from "./ColocalisationByType";
import StudiesByStudyType from "./StudiesByStudyType";
// import ByStudyTypeDonut from "./ByStudyTypeDonut";
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
      {/* <Typography variant="h4" sx={{ mb: 2 }}>Data Metrics</Typography> */}
      <MetricsCards data={data} />
      {/* <Typography sx={{ pt: 3 }}><b>Polish:</b> do these look like buttons? </Typography>
      <Typography><b>Todo:</b> finalise card order and icons - what for coloc? evidence and cred sets ok to be same? more info in tooltip where approp? - e.g. explain a prioritised gene</Typography>
      <Typography sx={{ pb: 3 }}><b>Alternative:</b> more hierarchical, e.g. split into top-level entity counts then evidence linking targets and diseases, credible sets and colocs in variants section.</Typography> */}
      
      {/* <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Coverage</Typography> */}

      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> Replace Other+tooltip with 'show more'?</Typography> */}
      <Paper sx={{ py: 2, px: 3, maxWidth: "100%", mt: 4 }} elevation={0} variant="outlined">
        <AssociationFacetChart data={data} />
      </Paper>
      <br />
      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> </Typography>       */}
      
      <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
        <DrugsByClinicalStage data={data} />
        <Box sx={{ height: "8px", width: "100%" }}></Box>
        <ClinicalReportsByStage data={data} />
      </Paper>
      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> </Typography> */}

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Genetics</Typography>
      <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
        <StudiesByStudyType data={data} />
        <Box sx={{ height: "8px", width: "100%" }}></Box>
        <CredibleSetsByStudyType data={data} />
        <Box sx={{ height: "8px", width: "100%" }}></Box>
        <ColocalisationByType data={data} />
      </Paper>
      <br />
      <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
        <ByStudyTypeHBar data={data} dataset="study" title="Studies by study type" />
      {/* <ByStudyTypeDonut data={data} dataset="study" title="Studies by study type" />
      <br /> */}
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
      {/* <Typography sx={{ pt: 3 }}><b>Polish:</b>Can we remove "variant" from every bar label?</Typography> */}
      {/* <Typography ><b>Alternative:</b>Replace Other+tooltip with 'show more'?</Typography> */}
    </>
  );
}

export default MetricsPage;
