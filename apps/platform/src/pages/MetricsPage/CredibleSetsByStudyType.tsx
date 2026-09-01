import ByStudyType from "./ByStudyType";
import type { MetricRow } from "./MetricsPage";

function CredibleSetsByStudyType({ data }: { data: MetricRow[] }) {
  return <ByStudyType data={data} dataset="credible_set" title="Credible sets by study type" />;
}

export default CredibleSetsByStudyType;
