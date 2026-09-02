import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import SIMILARENTTIES_SUMMARY_FRAGMENT from "./SimilarEntitiesSummary.gql";

function Summary() {
  const request = usePlatformApi(SIMILARENTTIES_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data =>
        data.literatureOcurrences?.filteredCount > 0 ? (
          <>
            {data.literatureOcurrences.filteredCount.toLocaleString()} publication
            {data.literatureOcurrences.filteredCount === 1 ? "" : "s"}
          </>
        ) : (
          <>no data</>
        )
      }
    />
  );
}

Summary.fragments = {
  EntitiesSummaryFragment: SIMILARENTTIES_SUMMARY_FRAGMENT,
};

export default Summary;
