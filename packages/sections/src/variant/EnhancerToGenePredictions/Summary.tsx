import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import ENHANCER_TO_GENE_PREDICTIONS_SUMMARY from "./EnhancerToGenePredictionsSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(ENHANCER_TO_GENE_PREDICTIONS_SUMMARY);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  VariantEnhancerToGenePredictionsSummaryFragment: ENHANCER_TO_GENE_PREDICTIONS_SUMMARY,
};

export default Summary; 