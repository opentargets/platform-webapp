import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import SUMMARY_TRACKS_SUMMARY_FRAGMENT from "./SummaryTracksSummary.gql";

function Summary() {
  const request = usePlatformApi(SUMMARY_TRACKS_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  SummaryTracksSummaryFragment: SUMMARY_TRACKS_SUMMARY_FRAGMENT,
};

export default Summary;