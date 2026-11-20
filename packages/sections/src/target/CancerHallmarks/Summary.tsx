import type { CancerHallmarksSummaryFragment } from "@ot/constants";
import _ from "lodash";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import CANCER_HALLMARKS_SUMMARY_FRAGMENT from "./HallmarksSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(CANCER_HALLMARKS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={(data: CancerHallmarksSummaryFragment) => {
        const hallmarks = _.uniqBy(data.hallmarks.cancerHallmarks, "label");
        const promote = _.uniqBy(
          data.hallmarks.cancerHallmarks.filter((d) => d.impact === "promotes"),
          "label"
        );
        const suppress = _.uniqBy(
          data.hallmarks.cancerHallmarks.filter((d) => d.impact === "suppresses"),
          "label"
        );

        return (
          <>
            {hallmarks.length} hallmarks
            <br />
            {promote.length} promoted • {suppress.length} suppressed
          </>
        );
      }}
    />
  );
}

Summary.fragments = {
  CancerHallmarksSummaryFragment: CANCER_HALLMARKS_SUMMARY_FRAGMENT,
};

export default Summary;
