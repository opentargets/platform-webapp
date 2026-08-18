import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "bibliography",
  name: "Bibliography",
  shortName: "B",
  category: "Literature",
  hasData: (data: TargetData) => (data.literatureOcurrences?.filteredCount || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 