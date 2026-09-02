import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import EXPRESSION_SUMMARY_FRAGMENT from "./ExpressionSummary.gql";

function Summary() {
  const request = usePlatformApi(EXPRESSION_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={() => {
        const hasRNA = request.data.expressions.some(d => d.rna.level >= 0);
        const hasProtein = request.data.expressions.some(d => d.protein.level >= 0);
        const expressionTypes = [];

        if (hasRNA) {
          expressionTypes.push("RNA");
        }

        if (hasProtein) {
          expressionTypes.push("Protein");
        }

        return expressionTypes.join(" • ");
      }}
    />
  );
}

Summary.fragments = {
  ExpressionSummaryFragment: EXPRESSION_SUMMARY_FRAGMENT,
};

export default Summary;
