import type { MousePhenotypesSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "mousePhenotypes",
  name: "Mouse Phenotypes",
  shortName: "MP",
  hasData: (data: MousePhenotypesSummaryFragment) => (data.mousePhenotypes?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
