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
      renderSummary={data => `${data.impc.count} entr${data.impc.count === 1 ? "y" : "ies"}`}
      subText={dataTypesMap.animal_model}
    />
  );
}

Summary.fragments = {
  IMCPSummaryFragment: IMCP_SUMMARY_FRAGMENT,
};

export default Summary;
