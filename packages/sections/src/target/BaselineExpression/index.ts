import type { ExpressionSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "baselineExpression",
  name: "Baseline Expression",
  shortName: "BE",
  // the GTEx tab fetches its own data, so only the baseline expression count is known here
  hasData: (data: ExpressionSummaryFragment) => (data.baselineExpression?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
