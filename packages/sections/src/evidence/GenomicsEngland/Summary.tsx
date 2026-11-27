import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import GENOMICS_ENGLAND_SUMMARY_FRAGMENT from "./GenomicsEnglandSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(GENOMICS_ENGLAND_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.genomicsEnglandPanelApp;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  GenomicsEnglandSummaryFragment: GENOMICS_ENGLAND_SUMMARY_FRAGMENT,
};

export default Summary;
