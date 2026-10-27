import type { TargetMolecularInteractionsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "interactions",
  name: "Molecular Interactions",
  shortName: "MI",
  hasData: (data: TargetMolecularInteractionsSummaryFragment) =>
    (data.interactions?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
