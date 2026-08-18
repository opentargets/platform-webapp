import { SummaryItem, usePlatformApi } from "ui";
import { dataTypesMap } from "@ot/constants";
import { definition } from ".";

import CRISPR_SUMMARY from "./CrisprSummary.gql";

function Summary() {
  const request = usePlatformApi(CRISPR_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ crisprSummary }) => {
        const { count } = crisprSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.affected_pathway}
    />
  );
}

Summary.fragments = {
  crisprSummary: CRISPR_SUMMARY,
};

export default Summary;
