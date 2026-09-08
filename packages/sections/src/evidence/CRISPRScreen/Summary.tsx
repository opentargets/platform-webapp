import { usePlatformApi, SummaryItem } from "ui";
import { dataTypesMap } from "@ot/constants";
import { definition } from ".";

import CRISPR_SUMMARY from "./CrisprScreenSummary.gql";

function Summary() {
  const request = usePlatformApi(CRISPR_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ CrisprScreenSummary }) => {
        const { count } = CrisprScreenSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.affected_pathway}
    />
  );
}

Summary.fragments = {
  CrisprScreenSummary: CRISPR_SUMMARY,
};

export default Summary;
