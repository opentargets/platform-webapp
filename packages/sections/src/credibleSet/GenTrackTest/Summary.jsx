import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import GEN_TRACK_TEST_SUMMARY_FRAGMENT from "./GenTrackTestSummary.gql";

function Summary() {
  const request = usePlatformApi(GEN_TRACK_TEST_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  GenTrackTestSummaryFragment: GEN_TRACK_TEST_SUMMARY_FRAGMENT,
};

export default Summary;