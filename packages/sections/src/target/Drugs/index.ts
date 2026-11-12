import type { TargetDrugsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "drugs",
  name: "Drugs and Clinical Candidates",
  shortName: "DC",
  hasData: (data: TargetDrugsSummaryFragment) => (data.drugAndClinicalCandidates?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
