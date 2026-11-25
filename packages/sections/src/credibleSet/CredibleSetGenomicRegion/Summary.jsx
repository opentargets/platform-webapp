import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import CREDIBLE_SET_GENOMIC_REGION_SUMMARY_FRAGMENT from "./CredibleSetGenomicRegionSummary.gql";

function Summary() {
  const request = usePlatformApi(CREDIBLE_SET_GENOMIC_REGION_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  CredibleSetGenomicRegionSummaryFragment: CREDIBLE_SET_GENOMIC_REGION_SUMMARY_FRAGMENT,
};

export default Summary;
