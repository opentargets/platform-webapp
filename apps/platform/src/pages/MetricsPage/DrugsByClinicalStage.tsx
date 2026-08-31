import ClinicalStageChart from "./ClinicalStageChart";
import type { MetricRow } from "./MetricsPage";

function DrugsByClinicalStage({ data }: { data: MetricRow[] }) {
  return <ClinicalStageChart data={data} dataset="drug_molecule" title="Drugs by clinical stage" />;
}

export default DrugsByClinicalStage;
