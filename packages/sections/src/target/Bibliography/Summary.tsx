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
        data.literatureOcurrences?.count > 0 ? (
          <>
            {data.literatureOcurrences.count.toLocaleString()} publication
            {data.literatureOcurrences.count === 1 ? "" : "s"}
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
