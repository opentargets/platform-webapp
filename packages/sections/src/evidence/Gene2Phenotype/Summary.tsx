import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import GENE_2_PHENOTYPE_SUMMARY_FRAGMENT from "./Gene2PhenotypeSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(GENE_2_PHENOTYPE_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.gene2Phenotype;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  Gene2PhenotypeSummaryFragment: GENE_2_PHENOTYPE_SUMMARY_FRAGMENT,
};

export default Summary;
