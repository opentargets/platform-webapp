import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "interactions",
  name: "Molecular Interactions",
  shortName: "MI",
  category: "Target",
  hasData: (data: TargetData) => (data.interactions?.count || 0) > 0 || false,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 