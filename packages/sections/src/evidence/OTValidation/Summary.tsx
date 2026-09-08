import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import OT_VALIDATION_SUMMARY from "./OTValidationSummary.gql";

function Summary() {
  const request = usePlatformApi(OT_VALIDATION_SUMMARY);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ otValidationSummary }) => {
        const { count } = otValidationSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.ot_validation_lab}
    />
  );
}

Summary.fragments = {
  otValidationSummary: OT_VALIDATION_SUMMARY,
};

export default Summary;
