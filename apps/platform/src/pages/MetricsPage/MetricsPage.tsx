import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { Typography } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards from "./MetricsCards";
import DiseasesByTherapeuticArea from "./DiseasesByTherapeuticArea";
import EvidenceChart from "./EvidenceChart";
import AssociationPlot from "./AssociationPlot";
import DrugsByClinicalStage from "./DrugsByClinicalStage";
import ClinicalReportsByStage from "./ClinicalReportsByStage";
import CredibleSetsByStudyType from "./CredibleSetsByStudyType";
import ColocalisationByType from "./ColocalisationByType";
import StudiesByStudyType from "./StudiesByStudyType";
import VariantsByConsequence from "./VariantsByConsequence";

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
      {/* <Typography sx={{ pt: 3 }}><b>Polish:</b> do these look like buttons? </Typography>
      <Typography><b>Todo:</b> finalise card order and icons - what for coloc? evidence and cred sets ok to be same? more info in tooltip where approp? - e.g. explain a prioritised gene</Typography>
      <Typography sx={{ pb: 3 }}><b>Alternative:</b> more hierarchical, e.g. split into top-level entity counts then evidence linking targets and diseases, credible sets and colocs in variants section.</Typography> */}
      
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Coverage</Typography>

      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> Replace Other+tooltip with 'show more'?</Typography> */}
      <EvidenceChart data={data} />
      <br />
      <AssociationPlot data={data} datasetPrefix="association_by_datasource_direct" title="Direct associations" />
      <br />
      <AssociationPlot data={data} datasetPrefix="association_by_datasource_indirect" title="Indirect associations" />
      <br />
      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> </Typography>       */}
      <DrugsByClinicalStage data={data} />
      <br />
      <ClinicalReportsByStage data={data} />
      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> </Typography> */}

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Genetics</Typography>
      <StudiesByStudyType data={data} />
      <br />
      <CredibleSetsByStudyType data={data} />
      <br />
      {/* <Typography sx={{ py: 3 }}><b>Alternative:</b> </Typography> */}
      <ColocalisationByType data={data} />
      <br />
      <VariantsByConsequence data={data} />
      {/* <Typography sx={{ pt: 3 }}><b>Polish:</b>Can we remove "variant" from every bar label?</Typography> */}
      {/* <Typography ><b>Alternative:</b>Replace Other+tooltip with 'show more'?</Typography> */}
    </>
  );
}

export default MetricsPage;
