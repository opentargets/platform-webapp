import { usePlatformApi, SummaryItem } from "ui";
import { definition } from ".";
import CANCER_BIOMARKERS_EVIDENCE_FRAGMENT from "./CancerBiomarkersEvidenceFragment.gql";

function Summary() {
  const request = usePlatformApi(CANCER_BIOMARKERS_EVIDENCE_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.cancerBiomarkers;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={definition.dataType}
    />
  );
}

Summary.fragments = {
  CancerBiomarkersEvidenceFragment: CANCER_BIOMARKERS_EVIDENCE_FRAGMENT,
};

export default Summary;
