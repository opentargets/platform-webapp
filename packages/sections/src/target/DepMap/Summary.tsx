import type { DepmapSummaryFragment } from "@ot/constants";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import DEPMAP_SUMMARY_FRAGMENT from "./DepmapSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(DEPMAP_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={(data: DepmapSummaryFragment) => <>{data.depMapEssentiality.count} tissues</>}
    />
  );
}

Summary.fragments = {
  DepmapSummaryFragment: DEPMAP_SUMMARY_FRAGMENT,
};

export default Summary;
