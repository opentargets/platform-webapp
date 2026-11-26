import { usePlatformApi, SummaryItem } from "ui";
import { dataTypesMap } from "@ot/constants";
import { definition } from ".";

import CLINICAL_PRECEDENCE_SUMMARY_FRAGMENT from "./ClinicalPrecedenceFragment.gql";

function Summary() {
  const request = usePlatformApi(CLINICAL_PRECEDENCE_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.clinicalPrecedence;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.clinical}
    />
  );
}

Summary.fragments = {
  ClinicalPrecedenceSummaryFragment: CLINICAL_PRECEDENCE_SUMMARY_FRAGMENT,
};

export default Summary;