import _ from "lodash";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import SAFETY_SUMMARY_FRAGMENT from "./summaryQuery.gql";

function Summary() {
  const request = usePlatformApi(SAFETY_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data => {
        const uniqueEvents = _.uniqBy(data.safetyLiabilities, "event");
        return `${uniqueEvents.length} unique safety events`;
      }}
    />
  );
}

Summary.fragments = {
  SafetySummaryFragment: SAFETY_SUMMARY_FRAGMENT,
};

export default Summary;
