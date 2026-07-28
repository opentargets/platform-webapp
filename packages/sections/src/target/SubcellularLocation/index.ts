import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "subcellularLocation",
  name: "Subcellular Location",
  shortName: "SL",
  category: "Target",
  hasData: (data: TargetData) => (data.subcellularLocations?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 