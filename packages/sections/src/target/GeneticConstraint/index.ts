import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "geneticConstraint",
  name: "Genetic Constraint",
  shortName: "GC",
  category: "Target-Variant",
  hasData: (data: TargetData) => (data.geneticConstraint?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 