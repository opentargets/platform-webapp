import type { SafetySummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "safety",
  name: "Safety",
  shortName: "S",
  hasData: (data: SafetySummaryFragment) => (data.safetyLiabilities?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
