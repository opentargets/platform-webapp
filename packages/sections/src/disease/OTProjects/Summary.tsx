import { SummaryItem, usePlatformApi } from "ui";

import OT_PROJECTS_SUMMARY_FRAGMENT from "./OTProjectsSummaryFragment.gql";
import { definition } from ".";

function Summary() {
  const request = usePlatformApi(OT_PROJECTS_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ otarProjects }) => (
        <>
          {otarProjects.length} OTAR project
          {otarProjects.length === 1 ? "" : "s"}
        </>
      )}
    />
  );
}

Summary.fragments = {
  OTProjectsSummaryFragment: OT_PROJECTS_SUMMARY_FRAGMENT,
};

export default Summary;
