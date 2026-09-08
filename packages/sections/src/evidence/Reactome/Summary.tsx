import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import REACTOME_SUMMARY from "./ReactomeSummary.gql";

function Summary() {
  const request = usePlatformApi(REACTOME_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ reactomeSummary }) => {
        const { count } = reactomeSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.affected_pathway}
    />
  );
}

Summary.fragments = {
  reactomeSummary: REACTOME_SUMMARY,
};

export default Summary;
