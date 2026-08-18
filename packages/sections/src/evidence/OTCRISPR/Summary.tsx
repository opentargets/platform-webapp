import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import OT_CRISPR_SUMMARY from "./OTCrisprSummary.gql";

function Summary() {
  const request = usePlatformApi(OT_CRISPR_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ OtCrisprSummary }) => {
        const { count } = OtCrisprSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.ot_partner}
    />
  );
}

Summary.fragments = {
  OtCrisprSummary: OT_CRISPR_SUMMARY,
};

export default Summary;
