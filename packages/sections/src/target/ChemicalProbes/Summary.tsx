import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import CHEMICAL_PROBES_SUMMARY_FRAGMENT from "./ProbesSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(CHEMICAL_PROBES_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={data =>
        data.chemicalProbes?.length > 0
          ? `${data.chemicalProbes.length} chemical probe${
              data.chemicalProbes.length !== 1 ? "s" : ""
            }`
          : null
      }
    />
  );
}

Summary.fragments = {
  ChemicalProbesSummaryFragment: CHEMICAL_PROBES_SUMMARY_FRAGMENT,
};

export default Summary;
