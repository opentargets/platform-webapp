import { lazy } from "react";

export const definition = {
  id: "drugs",
  name: "Drugs and Clinical Candidates",
  shortName: "DC",
  category: ["Target-Disease", "Drug"],
  hasData: (data) => data?.drugAndClinicalCandidates?.count > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
