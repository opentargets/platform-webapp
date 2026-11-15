import type { CompGenomicsSummaryFragment } from "@ot/constants";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import COMP_GENOMICS_SUMMARY_FRAGMENT from "./CompGenomicsSummaryFragment.gql";
import countHomologues from "./countHomologues";

function Summary() {
  const request = usePlatformApi(COMP_GENOMICS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ homologues }: CompGenomicsSummaryFragment) => {
        const { orthologueCount, paralogueCount } = countHomologues(homologues);
        return `${orthologueCount} orthologues and ${paralogueCount} paralogues`;
      }}
    />
  );
}

Summary.fragments = {
  CompGenomicsSummaryFragment: COMP_GENOMICS_SUMMARY_FRAGMENT,
};

export default Summary;
