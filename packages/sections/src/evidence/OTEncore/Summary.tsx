import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import OT_ENCORE_SUMMARY from "./OTEncoreSummary.gql";

function Summary() {
  const request = usePlatformApi(OT_ENCORE_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ otEncoreSummary }) => {
        const { count } = otEncoreSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.ot_partner}
    />
  );
}

Summary.fragments = {
  otEncoreSummary: OT_ENCORE_SUMMARY,
};

export default Summary;
