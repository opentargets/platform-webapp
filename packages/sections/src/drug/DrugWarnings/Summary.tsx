import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import DRUG_WARNINGS_SUMMARY_FRAGMENT from "./DrugWarningsSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(DRUG_WARNINGS_SUMMARY_FRAGMENT);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  DrugWarningsSummaryFragment: DRUG_WARNINGS_SUMMARY_FRAGMENT,
};

export default Summary;
