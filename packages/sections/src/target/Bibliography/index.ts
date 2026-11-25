import { lazy } from "react";
import type { TargetData } from "../../types/target";

export const definition = {
  id: "bibliography",
  name: "Bibliography",
  shortName: "B",
  hasData: (data: TargetData) => (data.literatureOcurrences?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
