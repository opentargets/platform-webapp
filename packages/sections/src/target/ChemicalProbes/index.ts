import type { ChemicalProbesSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "chemicalProbes",
  name: "Chemical Probes",
  shortName: "CP",
  hasData: (data: ChemicalProbesSummaryFragment) => (data.chemicalProbes?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
