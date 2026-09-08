import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import GENE_BURDEN_SUMMARY from "./GeneBurdenSummary.gql";

function Summary() {
  const request = usePlatformApi(GENE_BURDEN_SUMMARY);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ geneBurdenSummary }) => {
        const { count } = geneBurdenSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  geneBurdenSummary: GENE_BURDEN_SUMMARY,
};

export default Summary;
