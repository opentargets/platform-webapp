import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "cancerHallmarks",
  name: "Cancer Hallmarks",
  shortName: "CH",
  category: "Target-Disease",
  hasData: (data: TargetData) => (data.hallmarks?.cancerHallmarks?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
