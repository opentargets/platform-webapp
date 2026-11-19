import { lazy } from "react";

type EVASummaryData = {
  evaEvidences?: {
    count?: number;
  };
};

export const definition = {
  id: "eva",
  name: "ClinVar",
  shortName: "CV",
  hasData: (data: EVASummaryData) => (data.evaEvidences?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
