import ClinicalStageChart from "./ClinicalStageChart";
import type { MetricRow } from "./MetricsPage";

function ClinicalReportsByStage({ data }: { data: MetricRow[] }) {
  return (
    <ClinicalStageChart
      data={data}
      dataset="clinical_report"
      title="Clinical reports by stage"
    />
  );
}

export default ClinicalReportsByStage;
