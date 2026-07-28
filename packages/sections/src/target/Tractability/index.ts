import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "tractability",
  name: "Tractability",
  shortName: "TR",
  category: "Target",
  hasData: (data: TargetData) => (data.tractability?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 