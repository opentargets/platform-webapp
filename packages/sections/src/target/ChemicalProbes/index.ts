import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "chemicalProbes",
  name: "Chemical Probes",
  shortName: "CP",
  category: "Target",
  hasData: (data: TargetData) => (data.chemicalProbes?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 