import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "mousePhenotypes",
  name: "Mouse Phenotypes",
  shortName: "MP",
  hasData: (data: TargetData) => (data.mousePhenotypes?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 