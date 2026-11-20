import type { AdverseEventsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "adverseEvents",
  name: "Pharmacovigilance",
  shortName: "PV",
  hasData: (data: AdverseEventsSummaryFragment) => (data.adverseEvents?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
