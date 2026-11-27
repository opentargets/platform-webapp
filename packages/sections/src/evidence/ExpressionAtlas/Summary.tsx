import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import EXPRESSION_ATLAS_SUMMARY from "./ExpressionAtlasSummary.gql";

function Summary() {
  const request = usePlatformApi(EXPRESSION_ATLAS_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ evidenceViews }) => {
        const { count } = evidenceViews.expressionAtlas;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.rna_expression}
    />
  );
}

Summary.fragments = {
  expressionAtlasSummary: EXPRESSION_ATLAS_SUMMARY,
};

export default Summary;
