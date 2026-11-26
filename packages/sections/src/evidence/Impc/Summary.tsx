import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import IMCP_SUMMARY_FRAGMENT from "./IMCPSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(IMCP_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.impc;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.animal_model}
    />
  );
}

Summary.fragments = {
  IMCPSummaryFragment: IMCP_SUMMARY_FRAGMENT,
};

export default Summary;
