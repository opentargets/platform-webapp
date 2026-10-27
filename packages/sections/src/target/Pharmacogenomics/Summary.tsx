import type { TargetPharmacogenomicsSummaryFragment } from "@ot/constants";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import PHARMACOGENOMICS_SUMMARY_FRAGMENT from "./PharmacogenomicsSummary.gql";

function Summary() {
  const request = usePlatformApi(PHARMACOGENOMICS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ pharmacogenomics }: TargetPharmacogenomicsSummaryFragment) =>
        `${pharmacogenomics.count} Pharmacogenomics Records`
      }
    />
  );
}

Summary.fragments = {
  TargetPharmacogenomicsSummaryFragment: PHARMACOGENOMICS_SUMMARY_FRAGMENT,
};

export default Summary;
