import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import ADVERSE_EVENTS_SUMMARY_FRAGMENT from "./AdverseEventsSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(ADVERSE_EVENTS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data =>
        `${data.adverseEvents.count} adverse event${data.adverseEvents.count !== 1 ? "s" : ""}`
      }
    />
  );
}

Summary.fragments = {
  AdverseEventsSummaryFragment: ADVERSE_EVENTS_SUMMARY_FRAGMENT,
};

export default Summary;
