import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import SUBCELLULAR_LOCATION_FRAGMENT from "./SubcellularLocationFragment.gql";

function Summary() {
  const request = usePlatformApi(SUBCELLULAR_LOCATION_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ subcellularLocations }) =>
        `${subcellularLocations.length} subcelullar locations`
      }
    />
  );
}

Summary.fragments = {
  SubcellularLocationFragment: SUBCELLULAR_LOCATION_FRAGMENT,
};

export default Summary;
