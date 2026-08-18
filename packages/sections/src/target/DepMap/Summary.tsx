import _ from "lodash";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import DEPMAP_SUMMARY_FRAGMENT from "./DepmapSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(DEPMAP_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data => {
        return <>{data.depMapEssentiality?.length} tissues</>;
      }}
    />
  );
}

Summary.fragments = {
  DepmapSummaryFragment: DEPMAP_SUMMARY_FRAGMENT,
};

export default Summary;
