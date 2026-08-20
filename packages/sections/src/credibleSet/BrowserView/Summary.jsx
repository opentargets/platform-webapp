import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import BROWSER_VIEW_SUMMARY_FRAGMENT from "./BrowserViewSummary.gql";

function Summary() {
  const request = usePlatformApi(BROWSER_VIEW_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  BrowserViewSummaryFragment: BROWSER_VIEW_SUMMARY_FRAGMENT,
};

export default Summary;