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
      renderSummary={data =>
        `${data.europePmc.count} entr${data.europePmc.count === 1 ? "y" : "ies"}`
      }
      subText={dataTypesMap.literature}
    />
  );
}

Summary.fragments = {
  EuropePmcSummaryFragment: EUROPE_PMC_SUMMARY_FRAGMENT,
};

export default Summary;
