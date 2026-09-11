import ByStudyType from "./ByStudyType";
import type { MetricRow } from "./MetricsPage";

function StudiesByStudyType({ data }: { data: MetricRow[] }) {
  return <ByStudyType data={data} dataset="study" title="Studies by study type" />;
}

export default StudiesByStudyType;
