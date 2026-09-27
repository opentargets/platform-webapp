import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import VARIANT_GENOMIC_REGION_SUMMARY from "./VariantGenomicRegionSummary.gql";

function Summary() {
  const request = usePlatformApi(VARIANT_GENOMIC_REGION_SUMMARY);
  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  VariantGenomicRegionSummaryFragment: VARIANT_GENOMIC_REGION_SUMMARY,
};

export default Summary;
