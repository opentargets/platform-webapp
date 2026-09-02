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
      renderSummary={data =>
        `${data.gwasCredibleSets.count} entr${data.gwasCredibleSets.count === 1 ? "y" : "ies"}`
      }
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  EvidenceGWASCredibleSetsSummaryFragment: GWAS_CREDIBLE_SETS_SUMMARY_FRAGMENT,
};

export default Summary;
