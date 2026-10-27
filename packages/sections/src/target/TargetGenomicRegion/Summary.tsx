import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import TARGET_GENOMIC_REGION_SUMMARY from "./TargetGenomicRegionSummary.gql";

function Summary() {
  const request = usePlatformApi(TARGET_GENOMIC_REGION_SUMMARY);
  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  TargetGenomicRegionSummaryFragment: TARGET_GENOMIC_REGION_SUMMARY,
};

export default Summary;
