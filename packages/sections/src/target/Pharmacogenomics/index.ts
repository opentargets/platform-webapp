import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "pharmacogenetics",
  name: "Pharmacogenetics",
  shortName: "PGx",
  category: "Drug",
  hasData: (data: TargetData) => (data.pharmacogenomics?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 