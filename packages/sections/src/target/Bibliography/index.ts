import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "bibliography",
  name: "Bibliography",
  shortName: "B",
  hasData: (data: TargetData) => (data.literatureOcurrences?.filteredCount || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
export { literatureExportAdapter as exportAdapter } from "../../common/Literature/exportAdapter";
