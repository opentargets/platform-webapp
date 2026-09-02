import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import PATHWAYS_SUMMARY_FRAGMENT from "./PathwaysSummary.gql";

function Summary() {
  const request = usePlatformApi(PATHWAYS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ pathways }) => `${pathways.length} Reactome pathways`}
    />
  );
}

Summary.fragments = {
  PathwaysSummaryFragment: PATHWAYS_SUMMARY_FRAGMENT,
};

export default Summary;
