import _ from "lodash";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import GENE_ONTOLOGY_SUMMARY_FRAGMENT from "./GeneOntologySummary.gql";

function Summary() {
  const request = usePlatformApi(GENE_ONTOLOGY_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data => {
        const prefixCounts = _.countBy(data.geneOntology, row => row.aspect);
        return (
          <>
            {data.geneOntology.length} terms in total
            <br />
            {prefixCounts.F} MF • {prefixCounts.P} BP • {prefixCounts.C} CC
          </>
        );
      }}
    />
  );
}

Summary.fragments = {
  GeneOntologySummaryFragment: GENE_ONTOLOGY_SUMMARY_FRAGMENT,
};

export default Summary;
