import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import EVA_SUMMARY from "./EVASummaryQuery.gql";

function Summary() {
  const request = usePlatformApi(EVA_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evaSummary }) => {
        const { count } = evaSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  evaSummary: EVA_SUMMARY,
};

export default Summary;
