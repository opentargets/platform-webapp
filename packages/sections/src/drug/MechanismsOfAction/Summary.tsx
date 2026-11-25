import type { MechanismsOfActionSummaryFragment } from "@ot/constants";
import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import MECHANISM_OF_ACTION_SUMMARY_FRAGMENT from "./MechanismsOfActionSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(MECHANISM_OF_ACTION_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={(data: MechanismsOfActionSummaryFragment) => {
        const actionTypes = data.mechanismsOfAction?.uniqueActionTypes ?? [];
        const targetTypes = data.mechanismsOfAction?.uniqueTargetTypes ?? [];
        return (
          <>
            {actionTypes.length > 0 ? actionTypes.join(" • ") : null}
            <br />
            {targetTypes.length > 0 ? targetTypes.join(" • ") : null}
          </>
        );
      }}
    />
  );
}

Summary.fragments = {
  MechanismsOfActionSummaryFragment: MECHANISM_OF_ACTION_SUMMARY_FRAGMENT,
};

export default Summary;
