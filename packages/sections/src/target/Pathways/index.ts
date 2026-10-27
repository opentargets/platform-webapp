import type { PathwaysSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "pathways",
  name: "Pathways",
  shortName: "PW",
  hasData: (data: PathwaysSummaryFragment) => (data.pathways?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
