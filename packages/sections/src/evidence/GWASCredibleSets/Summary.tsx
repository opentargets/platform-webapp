import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import GWAS_CREDIBLE_SETS_SUMMARY_FRAGMENT from "./GWASCredibleSetsSummary.gql";

function Summary() {
  const request = usePlatformApi(GWAS_CREDIBLE_SETS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.gwasCredibleSets;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  EvidenceGWASCredibleSetsSummaryFragment: GWAS_CREDIBLE_SETS_SUMMARY_FRAGMENT,
};

export default Summary;
