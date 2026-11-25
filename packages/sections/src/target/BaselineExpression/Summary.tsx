import type { ExpressionSummaryFragment } from "@ot/constants";
import { SummaryItem, usePlatformApi } from "ui";
import { definition } from ".";
import EXPRESSION_SUMMARY_FRAGMENT from "./ExpressionSummary.gql";

function Summary() {
  const request = usePlatformApi(EXPRESSION_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ baselineExpression }: ExpressionSummaryFragment) =>
        `${baselineExpression.count} baseline expression measurements`
      }
    />
  );
}

Summary.fragments = {
  ExpressionSummaryFragment: EXPRESSION_SUMMARY_FRAGMENT,
};

export default Summary;
