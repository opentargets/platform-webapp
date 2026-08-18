import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";

import TRACTABILITY_SUMMARY_FRAGMENT from "./TractabilitySummary.gql";

function Summary() {
  const request = usePlatformApi(TRACTABILITY_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={() => {
        const modalities = [];
        // The summary UI has been simplified.
        // If we want to add back the sources/modalities summary,
        // just comment back in the following four blocks
        /* if (data.tractability?.find(el => el.modality==='AB' && el.value===true)) {
          modalities.push('Antibody');
        }
        if (data.tractability?.find(el => el.modality==='SM' && el.value===true)) {
          modalities.push('Small molecule');
        }
        if (data.tractability?.find(el => el.modality==='OC' && el.value===true)) {
          modalities.push('Other clinical modalities');
        }
        if (data.tractability?.find(el => el.modality==='PR' && el.value===true)) {
          modalities.push('PROTAC');
        } */
        if (modalities.length === 0) {
          modalities.push("Assessment available");
        }
        // return null for 'no data'
        return modalities.length > 0 ? modalities.join(" • ") : null;
      }}
    />
  );
}

Summary.fragments = {
  TractabilitySummaryFragment: TRACTABILITY_SUMMARY_FRAGMENT,
};

export default Summary;
