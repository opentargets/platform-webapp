import AssociationPlot from "./AssociationPlot";
import type { MetricRow } from "./MetricsPage";

function EvidenceChart({ data }: { data: MetricRow[] }) {
  return <AssociationPlot data={data} datasetPrefix="evidence_" title="Target-disease evidence" labelFromDataset />;
}

export default EvidenceChart;
