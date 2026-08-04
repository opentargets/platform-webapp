import { lazy } from "react";
import type { TargetData } from "../../types/target";

export const definition = {
  id: "baselineExpression",
  name: "Baseline Expression",
  shortName: "BE",
  category: "Target",
  hasData: (data: TargetData) => {
    return (
      (data.baselineExpression?.count || 0) > 0 || // main widget tab
      (data.expressions?.length || 0) > 0 // GTEx tab
    );
  },
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
