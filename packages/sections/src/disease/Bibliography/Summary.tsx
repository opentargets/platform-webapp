import { usePlatformApi, SummaryItem } from "ui";

import SIMILARENTTIES_SUMMARY_FRAGMENT from "./BibliographySummaryFragment.gql";
import { definition } from ".";

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
  DiseaseBibliography: SIMILARENTTIES_SUMMARY_FRAGMENT,
};

export default Summary;
