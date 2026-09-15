import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import GEN_TRACK_TEST_NEW_SUMMARY_FRAGMENT from "./GenTrackTestNewSummary.gql";

function Summary() {
  const request = usePlatformApi(GEN_TRACK_TEST_NEW_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  GenTrackTestNewSummaryFragment: GEN_TRACK_TEST_NEW_SUMMARY_FRAGMENT,
};

export default Summary;
