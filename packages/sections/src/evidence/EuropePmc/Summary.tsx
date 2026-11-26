import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import EUROPE_PMC_SUMMARY_FRAGMENT from "./EuropePmcSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(EUROPE_PMC_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.europePmc;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.literature}
    />
  );
}

Summary.fragments = {
  EuropePmcSummaryFragment: EUROPE_PMC_SUMMARY_FRAGMENT,
};

export default Summary;
